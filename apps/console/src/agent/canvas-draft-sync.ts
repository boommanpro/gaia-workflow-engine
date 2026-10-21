/**
 * 画布草稿回推 —— 「前端本地草稿 → 服务端会话草稿」缺失的半边链路（阶段 1.1 / 2.1）。
 *
 * 历史断点：AI 的修改经 SSE 单向流入本地 store，而本地（尤其专家模式编辑器里的
 * 手改与回滚）没有任何通道写回服务端 —— 于是「回滚后再保存」落的是撤销前的
 * 服务端旧内容、「提问」时 AI 读的是旧参数（它只认服务端草稿）。
 *
 * 同步点把「用户眼前的画布」推成服务端权威草稿：
 *   1. 回滚后（rollbackCanvasTo —— 本文件的统一入口）
 *   2. 提问前（AgentContext.sendMessage，/chat 与编辑器一视同仁）
 *   3. 会话「保存为版本」前（ArtifactPanel.handleSave）
 *   4. 编辑器保存成功后回写（editor.tsx），让 AI 的下一轮与保存结果一致
 *   5. 手改自动同步（scheduleManualDraftPush，编辑停止 ~1.2s 后推送）——
 *      「让模型感知」不再依赖用户保存：草稿就是会话内编辑的持久化层，
 *      「保存为版本」只是显式的落版动作，与感知彻底无关
 */
import { workflowDocumentStore } from '../document';
import { getSessionKeyForWorkflow } from '../ai-workspace/session-scope';
import { agentApi } from './api';
import { liveStreamStore } from './live-stream-store';

export interface DraftPushResult {
  ok: boolean;
  /** 本地没有可推内容（空画布 / 无会话）时跳过，不算失败 */
  skipped?: boolean;
  /** 跳过原因：no-session=画布未关联会话；empty=画布为空 */
  reason?: 'no-session' | 'empty';
  error?: string;
}

/** 同步记账：本地是否与服务端草稿对齐（AI document 守卫的按需条件） */
let lastSyncedAt = 0;
let dirtySince = 0;

/**
 * 本地是否有尚未同步到服务端草稿的手改。
 * AI 的 document 事件是整份 DSL：本地干净时直接应用；有未同步手改时才拦截成
 * 「待应用变更」，防止 AI 的整表替换冲掉用户刚改的内容。
 */
export function hasUnsyncedLocalEdits(): boolean {
  return dirtySince > lastSyncedAt;
}

/** 本地已与服务端草稿对齐（AI 修改直接应用到 store 后调用；store 内容即服务端内容） */
export function markSyncedWithServer(): void {
  lastSyncedAt = Date.now();
  dirtySince = 0;
}

/** 把当前本地画布推成会话的服务端草稿（非空校验 + 绑定码随行） */
export async function pushCanvasDraftToSession(
  sessionKey: string | null | undefined,
  opts?: { workflowCode?: string; source?: string; dsl?: any },
): Promise<DraftPushResult> {
  if (!sessionKey || sessionKey.startsWith('draft-')) {
    return { ok: true, skipped: true, reason: 'no-session' };
  }
  const startedAt = Date.now();
  const { doc, meta } = workflowDocumentStore.getSnapshot();
  if (doc.isEmpty) return { ok: true, skipped: true, reason: 'empty' };
  const dsl = opts?.dsl ?? doc.toJSON();
  if (!dsl || !Array.isArray(dsl.nodes) || dsl.nodes.length === 0) {
    return { ok: true, skipped: true, reason: 'empty' };
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
    lastSyncedAt = startedAt;
    if (dirtySince <= startedAt) dirtySince = 0;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** 手改自动推送的防抖句柄（连续编辑只推最后一次） */
let manualPushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 手改自动同步（去保存化）：编辑停止 ~1.2s 后把眼前画布推成服务端草稿。
 * 服务端会记草稿修订号并对 manual-edit/rollback 推送写「[画布更新]」注记进对话，
 * 模型由此感知用户改了什么 —— 不再需要用户「保存」才让 AI 看见。
 * 运行中不推：AI 正在改服务端草稿，此时推送会互相覆盖（手改走待应用变更队列语义）。
 * 由编辑器的变更漏斗（use-editor-props.flushCanvasChange）调用；sessionKey 由
 * 画布绑定的 workflowCode 反查，无绑定时静默跳过。
 */
export function scheduleManualDraftPush(): void {
  if (manualPushTimer) clearTimeout(manualPushTimer);
  // 排队即「有未同步手改」：push 成功后才解除（AI document 守卫按此判断是否拦截）
  dirtySince = Date.now();
  manualPushTimer = setTimeout(() => {
    manualPushTimer = null;
    if (liveStreamStore.getSnapshot().streaming) return;
    const { meta } = workflowDocumentStore.getSnapshot();
    void pushCanvasDraftToSession(getSessionKeyForWorkflow(meta.workflowCode || ''), {
      source: 'manual-edit',
    });
  }, 1200);
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
