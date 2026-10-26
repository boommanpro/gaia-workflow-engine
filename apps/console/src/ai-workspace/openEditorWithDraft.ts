/**
 * openEditorWithDraft —— 对话页进入专家模式的统一跳转。
 *
 * 同标签页跳转（非新开标签）：workflowDocumentStore 是模块级单例，
 * AI 刚生成的那份 DSL 原样承接，对话会话不断（AgentContext 全局）。
 * 带上 state.from 让编辑器「返回」回到来源会话。
 */
import type { NavigateFunction } from 'react-router-dom';

export function openEditorWithDraft(opts: {
  dsl: unknown;
  workflowCode?: string | null;
  navigate: NavigateFunction;
  from: string;
  sessionKey?: string | null;
  /** 编辑器标题兜底（草稿未落版时 store meta 没有工作流名，用会话标题） */
  workflowName?: string | null;
}): void {
  try {
    sessionStorage.setItem('gaia.artifactDraft', JSON.stringify(opts.dsl));
  } catch {
    /* 忽略隐私模式下的写入失败 */
  }
  const code = opts.workflowCode?.trim();
  opts.navigate(code ? `/editor/${encodeURIComponent(code)}` : '/editor/__draft__', {
    state: {
      from: opts.from,
      sessionKey: opts.sessionKey || undefined,
      workflowName: opts.workflowName || undefined,
    },
  });
}
