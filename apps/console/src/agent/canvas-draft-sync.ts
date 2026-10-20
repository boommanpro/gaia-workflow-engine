/**
 * 画布草稿回推 —— 「前端本地草稿 → 服务端会话草稿」缺失的半边链路（阶段 1.1 / 2.1）。
 *
 * 历史断点：AI 的修改经 SSE 单向流入本地 store，而本地（尤其专家模式编辑器里的
 * 手改与回滚）没有任何通道写回服务端 —— 于是「回滚后再保存」落的是撤销前的
 * 服务端旧内容、「提问」时 AI 读的是旧参数（它只认服务端草稿）。
 *
 * 三个同步点把「用户眼前的画布」推成服务端权威草稿：
 *   1. 回滚后（rollbackCanvasTo —— 本文件的统一入口）
 *   2. 编辑器里提问前（AgentContext.sendMessage）
 *   3. 会话「保存为版本」前（ArtifactPanel.handleSave）
 * 另有第 4 点：编辑器保存成功后回写（editor.tsx），让 AI 的下一轮与保存结果一致。
 */
import { workflowDocumentStore } from '../document';
import { agentApi } from './api';
import { liveStreamStore } from './live-stream-store';

export interface DraftPushResult {
  ok: boolean;
  /** 本地没有可推内容（空画布 / 无会话）时跳过，不算失败 */
  skipped?: boolean;
  error?: string;
}

/** 把当前本地画布推成会话的服务端草稿（非空校验 + 绑定码随行） */
export async function pushCanvasDraftToSession(
  sessionKey: string | null | undefined,
  opts?: { workflowCode?: string; source?: string },
): Promise<DraftPushResult> {
  if (!sessionKey || sessionKey.startsWith('draft-')) return { ok: true, skipped: true };
  const { doc, meta } = workflowDocumentStore.getSnapshot();
  if (doc.isEmpty) return { ok: true, skipped: true };
  const dsl = doc.toJSON();
  if (!dsl || !Array.isArray(dsl.nodes) || dsl.nodes.length === 0) {
    return { ok: true, skipped: true };
  }
  try {
    const res = await agentApi.pushDraft(sessionKey, {
      dsl,
      workflowCode: opts?.workflowCode || meta.workflowCode || undefined,
      source: opts?.source,
    });
    if (!res?.success) {
      return { ok: false, error: res?.error || 'push failed' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 回滚并同步：本地 rollbackTo 之外，把回滚后的画布推回服务端草稿 ——
 * 否则「撤销后保存 / 撤销后继续提问」仍基于撤销前的内容。
 * 运行中（streaming）不同步：AI 正在改服务端草稿，此时推送会互相覆盖；
 * 运行中回滚的完整处理属于阶段 2.4。
 */
export function rollbackCanvasTo(
  snapshotId: string,
  sessionKey: string | null | undefined,
  onSyncFailed?: (error: string) => void,
): boolean {
  const ok = workflowDocumentStore.rollbackTo(snapshotId);
  if (!ok) return false;
  if (liveStreamStore.getSnapshot().streaming) return true;
  void pushCanvasDraftToSession(sessionKey, { source: 'rollback' }).then((res) => {
    if (!res.ok && !res.skipped) onSyncFailed?.(res.error || 'sync failed');
  });
  return true;
}
