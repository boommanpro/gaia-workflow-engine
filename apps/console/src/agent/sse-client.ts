/**
 * SSE 流式客户端
 * 浏览器 EventSource 不支持 POST body，用 fetch + ReadableStream 手动解析 SSE
 *
 * 回放模式：?replay=<fixture> 激活后订阅走 replay-driver（零后端离线驱动）。
 */
import { getApiBaseUrl } from '../utils/apiConfig';
import { getCurrentLocale } from '../i18n';
import { isReplayActive, replaySessionStream } from './replay/replay-driver';
import { handleEvent } from './sse-protocol';
import type { SseHandlers } from './types';

/** 空闲看门狗阈值：超过该时长没收到任何字节就断开重连。
 *  后端心跳 20s/条，正常连接永远不会触发；半开连接（休眠/切网/代理断链）上
 *  reader.read() 永不返回也不报错，重连循环因此永不触发——「运行中卡死不报错」的根因。 */
const SSE_IDLE_TIMEOUT_MS = 60_000;

/**
 * 读取 SSE 流并分发事件
 */
async function readSseStream(
  response: Response,
  handlers: SseHandlers,
  controller?: AbortController
): Promise<void> {
  const signal = controller?.signal;
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';

  // 空闲看门狗：到期主动断开当前流（abort → read() 报 AbortError → 优雅返回），
  // 让外层 connect() 走既有重连路径；重连回放运行快照能直接收敛到终态。
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

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.substring(5).trim();
          if (data) {
            try {
              const parsed = JSON.parse(data);
              handleEvent(eventName, parsed, handlers);
            } catch {
              // 忽略无法解析的行
            }
          }
        }
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

/**
 * 订阅会话级后端自治运行的事件流（SSE，含断线重连回放运行快照）。
 * 连接保持打开；返回的 Promise 在流结束或取消时 resolve。
 * 响应就绪即回调 onOpen（连接状态收敛依据，先于任何事件）。
 *
 * 取消语义：看门狗/重连需要 abort 单次连接，但不能 abort 调用方的
 * signal（那是整段订阅的生命周期）——所以这里挂一层内部 controller，
 * 外部 abort 时联动内部，内部 abort 不外溢。
 */
export function subscribeSessionEvents(
  sessionKey: string,
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  if (isReplayActive()) {
    return replaySessionStream(handlers, signal);
  }
  const url = `${getApiBaseUrl()}/agent/session/${encodeURIComponent(sessionKey)}/events`;
  const internal = new AbortController();
  const onExternalAbort = () => internal.abort();
  if (signal) {
    if (signal.aborted) internal.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    signal: internal.signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Session Events API Error: ${response.status}`);
    }
    handlers.onOpen?.();
    await readSseStream(response, handlers, internal);
  }).finally(() => {
    signal?.removeEventListener('abort', onExternalAbort);
  });
}

/**
 * 子 Agent 执行（SSE 流式）
 */
export async function streamSubagent(
  sessionKey: string,
  message: string,
  pageContext: string,
  handlers: SseHandlers
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
  await readSseStream(response, handlers);
}
