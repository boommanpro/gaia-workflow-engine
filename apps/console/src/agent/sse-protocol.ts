/**
 * SSE 事件协议 —— 事件名 → handler 分发（真实 SSE 流与回放驱动共用同一分发，
 * 保证回放场景与线上行为逐字节一致）。
 */
import type { SseHandlers, ToolCallEvent } from './types';

export function handleEvent(
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
    case 'artifact':
      handlers.onArtifact?.(data);
      break;
    case 'ui_action':
      handlers.onUiAction?.(data);
      break;
    // ===== 护栏/韧性事件 =====
    case 'repeat_reminder':
      handlers.onGuardNotice?.({ source: 'repeat', message: data.message || '', hardStop: !!data.hardStop });
      break;
    case 'wrap_up':
      handlers.onGuardNotice?.({ source: 'wrap_up', message: data.message || data.reason || '' });
      break;
    case 'llm_retry':
      handlers.onGuardNotice?.({
        source: 'llm_retry',
        message: `模型响应异常（${data.code || 'RETRY'}），第 ${data.attempt ?? '-'} 次自动重试…`,
        attempt: data.attempt,
        delayMs: data.delayMs,
      });
      break;
    case 'interrupted':
      handlers.onGuardNotice?.({ source: 'interrupted', message: '⏹ 本次运行已被中断，已完成的部分保持有效。' });
      break;
    case 'compaction':
      // 压缩可观测（对标 OWB trim/compact 播报）：kind=prune 确定性裁剪 / kind=summary 模型摘要
      if (data.kind === 'prune') {
        handlers.onGuardNotice?.({
          source: 'compaction',
          message: `📜 历史过长，已裁剪 ${data.dropped ?? '?'} 条（保留最近 ${data.after ?? '?'} 条）`,
        });
      } else {
        handlers.onGuardNotice?.({
          source: 'compaction',
          message: `📜 已压缩历史：摘要了 ${data.removed ?? '?'} 条消息（压缩前 ≈${data.tokenPercentageBefore ?? '?'}% 上下文）`,
        });
      }
      break;
    case 'run_end':
      handlers.onRunEnd?.(data);
      break;
    case 'assistant_settled':
      handlers.onAssistantSettled?.(data);
      break;
    case 'done':
      handlers.onDone?.();
      break;
    case 'error':
      handlers.onError?.(data.message);
      break;
  }
}
