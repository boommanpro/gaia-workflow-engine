/**
 * SSE 流式客户端
 * 浏览器 EventSource 不支持 POST body，用 fetch + ReadableStream 手动解析 SSE
 */
import { getApiBaseUrl } from '../utils/apiConfig';
import { getCurrentLocale } from '../i18n';
import type { SseHandlers, ToolCallEvent } from './types';

export interface ToolResultItem {
  toolCallId: string;
  result: string;
  rejected: boolean;
}

/**
 * 发送对话消息（SSE 流式）
 */
export async function streamChat(
  sessionKey: string,
  message: string,
  pageContext: string,
  handlers: SseHandlers,
  signal?: AbortSignal,
  images?: string[]
): Promise<void> {
  const url = `${getApiBaseUrl()}/agent/chat`;
  const body: Record<string, any> = {
    sessionKey,
    message,
    pageContext,
    locale: getCurrentLocale(),
  };
  if (images && images.length > 0) {
    body.images = images;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat API Error: ${response.status}`);
  }

  await readSseStream(response, handlers, signal);
}

/**
 * 回灌工具执行结果后继续对话（SSE 流式）
 */
export async function streamToolResult(
  sessionKey: string,
  results: ToolResultItem[],
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  const url = `${getApiBaseUrl()}/agent/tool-result`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionKey,
      results,
      locale: getCurrentLocale(),
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`ToolResult API Error: ${response.status}`);
  }

  await readSseStream(response, handlers, signal);
}

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

function handleEvent(
  name: string,
  data: any,
  handlers: SseHandlers
): void {
  switch (name) {
    case 'token':
      handlers.onToken?.(data.content);
      break;
    case 'tool_call':
      // 后端自治运行的 tool_call 形如 {id, name, args}，统一归一化为前端 ToolCallEvent
      handlers.onToolCall?.({
        id: data.id,
        action: data.name ?? data.action,
        args: data.args ?? {},
        policy: 'always',
        executedBy: data.executedBy,
      } as ToolCallEvent);
      break;
    case 'thinking':
      // 方舟托管引擎的思考过程增量；未注册 handler 时自然忽略
      handlers.onThinking?.(data);
      break;
    case 'usage':
      // 方舟托管引擎的模型请求用量聚合
      handlers.onUsage?.(data);
      break;
    case 'debug_request':
      handlers.onDebugRequest?.(data);
      break;
    case 'debug_response':
      handlers.onDebugResponse?.(data);
      break;
    case 'debug_tool_result':
      handlers.onDebugToolResult?.(data);
      break;
    case 'context_loaded':
      handlers.onContextLoaded?.(data);
      break;
    case 'token_warning':
      handlers.onTokenWarning?.(data);
      break;
    case 'subagent_tool_call':
      handlers.onSubagentToolCall?.(data);
      break;
    case 'subagent_round_done':
      handlers.onSubagentRoundDone?.(data);
      break;
    case 'subagent_final_result':
      handlers.onSubagentFinalResult?.(data);
      break;
    case 'subagent_done':
      handlers.onSubagentDone?.();
      break;
    // ===== 会话级后端自治运行事件 =====
    case 'run_state':
      handlers.onRunState?.(data);
      break;
    case 'turn':
      handlers.onTurn?.(data);
      break;
    case 'tool_result':
      handlers.onToolResult?.(data);
      break;
    case 'plan':
      handlers.onPlan?.(data);
      break;
    case 'document':
      handlers.onDocument?.(data);
      break;
    case 'ui_action':
      handlers.onUiAction?.(data);
      break;
    case 'confirm_request':
      handlers.onConfirmRequest?.(data);
      break;
    case 'confirm_resolved':
      handlers.onConfirmResolved?.(data);
      break;
    case 'done':
      handlers.onDone?.();
      break;
    case 'error':
      handlers.onError?.(data.message);
      break;
  }
}

/**
 * 订阅会话级后端自治运行的事件流（SSE，含断线重连回放运行快照）。
 * 连接保持打开；返回的 Promise 在流结束或取消时 resolve。
 */
export function subscribeSessionEvents(
  sessionKey: string,
  handlers: SseHandlers,
  signal?: AbortSignal
): Promise<void> {
  const url = `${getApiBaseUrl()}/agent/session/${encodeURIComponent(sessionKey)}/events`;
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Session Events API Error: ${response.status}`);
    }
    await readSseStream(response, handlers, signal);
  });
}

/**
 * 压缩会话历史（SSE 流式）
 */
export async function streamCompact(sessionKey: string, handlers: SseHandlers): Promise<void> {
  const url = `${getApiBaseUrl()}/agent/compact?sessionKey=${encodeURIComponent(sessionKey)}`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) throw new Error(`Compact API Error: ${response.status}`);
  await readSseStream(response, handlers);
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
