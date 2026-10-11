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

/**
 * 读取 SSE 流并分发事件
 */
async function readSseStream(
  response: Response,
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
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
    // AbortError 视为优雅停止，不抛出
    if (signal?.aborted || (e as Error).name === 'AbortError') {
      return;
    }
    throw e;
  } finally {
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
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Session Events API Error: ${response.status}`);
    }
    handlers.onOpen?.();
    await readSseStream(response, handlers, signal);
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
