/**
 * SSE 流式客户端 v3
 *
 *  · 浏览器 EventSource 不支持自定义头（Last-Event-ID 续传），用 fetch + ReadableStream；
 *  · SseReader 增量解析（不在每个 chunk 上重扫整个缓冲，支持多行 data / \r\n）；
 *  · 断线重连：指数退避 + 抖动（1s→2s→…→30s 封顶，成功后归零），重连带
 *    Last-Event-ID 请求头，后端缓冲覆盖时精确重放缺失事件；
 *  · 空闲看门狗：60s 无字节主动断开重连（半开连接上 read() 永不返回也不报错——
 *    「运行中卡死不报错」的旧根因）；
 *  · 回放模式：?replay=<fixture> 激活后订阅走 replay-driver（同一帧分发路径）。
 */
import { getApiBaseUrl } from '../utils/apiConfig';
import { getCurrentLocale } from '../i18n';
import { isReplayActive, replaySessionStream } from './replay/replay-driver';
import { SseReader, type SseFrame } from './runtime/sse-reader';

/** 空闲看门狗阈值：超过该时长没收到任何字节就断开重连（后端心跳 20s/条） */
const SSE_IDLE_TIMEOUT_MS = 60_000;
/** 重连退避：基数 / 封顶 / 抖动比例 */
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;
const BACKOFF_JITTER = 0.3;

export interface SessionStreamCallbacks {
  /** 连接建立（HTTP 响应就绪，事件尚未到达）——连接状态据此收敛 */
  onOpen?: () => void;
  /** 每个完整帧（含 event/data/id）；id 为事件 seq，供续传与去重 */
  onFrame: (frame: SseFrame) => void;
  /** 重连游标：返回 runtime 已应用的最大 seq（null = 首连不带 Last-Event-ID） */
  getLastEventId?: () => number | null;
  /** 进入重连等待（UI 显式呈现「连接中断」而非假装流式中） */
  onReconnecting?: (attempt: number) => void;
}

/** 解析一条 SSE 响应流（frame 逐帧回调）；连接层异常上抛，由外层决定重连 */
async function readSseResponse(
  response: Response,
  callbacks: Pick<SessionStreamCallbacks, 'onFrame'>,
  controller?: AbortController
): Promise<void> {
  const signal = controller?.signal;
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const sseReader = new SseReader();

  // 空闲看门狗：到期主动断开当前流（abort → read() 报 AbortError → 优雅返回），
  // 让外层重连循环走既有路径；重连（Last-Event-ID 重放）能直接收敛到最新现场。
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdleWatchdog = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      try {
        reader.cancel();
      } catch { /* ignore */ }
      controller?.abort();
    }, SSE_IDLE_TIMEOUT_MS);
  };
  armIdleWatchdog();

  try {
    while (true) {
      const { done, value } = await reader.read();
      armIdleWatchdog();
      if (done) break;
      const frames = sseReader.push(decoder.decode(value, { stream: true }));
      for (const frame of frames) {
        callbacks.onFrame(frame);
      }
    }
  } catch (e) {
    // AbortError 视为优雅停止，不抛出（看门狗断流 / 上层取消都走这里）
    if (signal?.aborted || (e as Error).name === 'AbortError') {
      return;
    }
    throw e;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

function backoffDelay(attempt: number): number {
  const exp = Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1), BACKOFF_CAP_MS);
  const jitter = 1 + (Math.random() * 2 - 1) * BACKOFF_JITTER;
  return Math.round(exp * jitter);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 订阅会话级后端自治运行的事件流（SSE，断线自动重连 + Last-Event-ID 精确续传）。
 * 连接保持打开；返回的 Promise 在取消（signal abort）时 resolve。
 */
export function subscribeSessionEvents(
  sessionKey: string,
  callbacks: SessionStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (isReplayActive()) {
    return replaySessionStream(callbacks, signal);
  }
  const url = `${getApiBaseUrl()}/agent/session/${encodeURIComponent(sessionKey)}/events`;

  const connect = async (): Promise<void> => {
    let attempt = 0;
    while (!signal?.aborted) {
      const internal = new AbortController();
      const onExternalAbort = () => internal.abort();
      if (signal) {
        if (signal.aborted) {
          internal.abort();
          break;
        }
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }
      try {
        const lastEventId = callbacks.getLastEventId?.() ?? null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (lastEventId && lastEventId > 0) {
          headers['Last-Event-ID'] = String(lastEventId);
        }
        const response = await fetch(url, { headers, signal: internal.signal });
        if (!response.ok || !response.body) {
          throw new Error(`Session Events API Error: ${response.status}`);
        }
        callbacks.onOpen?.();
        attempt = 0; // 连接成功：退避归零
        await readSseResponse(response, callbacks, internal);
      } catch (e) {
        if (signal?.aborted || (e as Error).name === 'AbortError') {
          signal?.removeEventListener('abort', onExternalAbort);
          return;
        }
        // eslint-disable-next-line no-console
        console.warn('[agent] session event stream error, reconnecting...', e);
      } finally {
        signal?.removeEventListener('abort', onExternalAbort);
      }
      if (signal?.aborted) return;
      // 流被服务端正常结束 / 网络错误：退避重连，重连回放能收敛到最新状态
      attempt += 1;
      callbacks.onReconnecting?.(attempt);
      await sleep(backoffDelay(attempt));
    }
  };
  return connect();
}

/**
 * 子 Agent 执行（SSE 流式；调试节点用，帧直接回调）
 */
export async function streamSubagent(
  sessionKey: string,
  message: string,
  pageContext: string,
  onEvent: (name: string, data: any) => void
): Promise<void> {
  const params = new URLSearchParams({
    sessionKey,
    message,
    locale: getCurrentLocale(),
  });
  if (pageContext) params.set('pageContext', pageContext);
  const url = `${getApiBaseUrl()}/subagent/run?${params}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`Subagent API Error: ${response.status}`);
  await readSseResponse(response, {
    onFrame: (frame) => {
      try {
        onEvent(frame.event, frame.data ? JSON.parse(frame.data) : {});
      } catch {
        // 忽略无法解析的帧
      }
    },
  });
}
