/**
 * 画布草稿回推 —— 「前端本地草稿 → 服务端会话草稿」的半边链路。
 *
 * 历史断点：AI 的修改经 SSE 单向流入本地 store，而本地（尤其专家模式编辑器里的
 * 手改与回滚）没有任何通道写回服务端 —— 于是「回滚后再保存」落的是撤销前的
 * 服务端旧内容、「提问」时 AI 读的是旧参数（它只认服务端草稿）。
 *
 * 推送触发点（2026-10-27 保存制回归：编辑停止后的自动推送已按产品决策移除，
 * 用户显式保存是主通道，两个关键节点保留自动兜底）：
 *   1. 编辑器「保存」按钮（草稿模式与正式模式对齐的用户确认动作）
 *   2. 提问前（sendMessage：仅当有未保存修改时自动保存，AI 基于所见内容回答）
 *   3. 切会话确认「保存并离开」（AgentContext.switchSession）
 *   4. 回滚后（rollbackCanvasTo —— 撤销要同步撤销，否则保存/提问仍基于撤销前内容）
 *   5. 会话「保存为版本」前（ArtifactPanel.handleSave 对齐所见即所存）
 *   6. 编辑器落版保存成功后回写（editor.tsx settleSaved），让 AI 的下一轮与保存结果一致
 */
import { workflowDocumentStore } from '../document';
import { getSessionKeyForWorkflow } from '../ai-workspace/session-scope';
import { agentApi } from './api';
import { sessionRuntime } from './runtime/store';

export interface DraftPushResult {
  ok: boolean;
  /** 本地没有可推内容（空画布 / 无会话）时跳过，不算失败 */
  skipped?: boolean;
  /** 跳过原因：no-session=画布未关联会话；empty=画布为空 */
  reason?: 'no-session' | 'empty';
  error?: string;
}

/**
 * 这份画布的草稿该推给哪段会话。
 *
 * 优先 store 里记录的画布归属会话（ownerSession，AI document 事件应用时写入）——
 * AI 全新生成、从未「保存为版本」的草稿没有 workflowCode，靠编码反查必然为空，
 * 手改同步曾在整个「对话 → 精修」主流程上静默失效（2026-10-27 修复）。
 * 编码反查只作兜底（正式模式落版后的路径）。
 */
export function resolveDraftTargetSession(): string | null {
  const { meta } = workflowDocumentStore.getSnapshot();
  if (meta.ownerSession && !meta.ownerSession.startsWith('draft-')) return meta.ownerSession;
  return getSessionKeyForWorkflow(meta.workflowCode || '');
}

/** 最近一次推送的内容指纹（回声判定）：我们刚推上去的 DSL 广播回来时不该
 *  再应用一次 —— 画布侧与 store 侧的序列化字段集不同，「与本地对比等价」
 *  判不出这种回声（阶段 1.3 实测保存后「未保存」复发的根因） */
let lastPushedFingerprint: { at: number; canon: string } | null = null;

/** 规范化序列化（对象键排序）：只比较内容等价性，不比较键序 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

/** DSL 内容指纹：只取 nodes/edges —— 服务端广播会附 _meta（修订号等），
 *  连 _meta 一起比对会把「自己刚推的内容」判成不同。
 *  另外要剥掉 null 值：服务端存草稿时按「null = 删除键」语义清洗（stripNulls），
 *  画布侧序列化携带的 format:null 之类字段回来就没了，不剥则回声永远判不等 */
function contentFingerprint(dsl: unknown): string {
  const d = (dsl || {}) as { nodes?: unknown; edges?: unknown };
  return canonicalJson({
    nodes: stripNulls(d.nodes) || [],
    edges: stripNulls(d.edges) || [],
  });
}

/** 递归剥除 null 值（与服务端 stripNulls 的存储语义对齐，仅用于指纹比较） */
function stripNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    return value.map(stripNulls).filter((x) => x !== undefined);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const stripped = stripNulls(v);
      if (stripped !== undefined) out[k] = stripped;
    }
    return out;
  }
  return value;
}

/** 这份 DSL 是否就是我们最近推上去的内容（10s 内）——document 广播回声 */
export function isEchoOfLastPush(dsl: unknown): boolean {
  if (!lastPushedFingerprint) return false;
  if (Date.now() - lastPushedFingerprint.at > 10_000) return false;
  try {
    return contentFingerprint(dsl) === lastPushedFingerprint.canon;
  } catch {
    return false;
  }
}

/**
 * 本地是否有尚未保存（= 未推送到服务端草稿）的修改。
 * 保存制下「未同步」与「未保存」同义：数据源是 store 的 dirtySinceSave
 * （手改/AI 修改/回滚置位，markSaved 清除；纯布局拖动也置位）。
 * AI 的 document 事件是整份 DSL：本地干净时直接应用；有未保存修改时才拦截成
 * 「待应用变更」，防止 AI 的整表替换冲掉用户刚改的内容。
 */
export function hasUnsyncedLocalEdits(): boolean {
  return workflowDocumentStore.getSnapshot().meta.dirtySinceSave === true;
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
  if (doc.isEmpty) {
    return { ok: true, skipped: true, reason: 'empty' };
  }
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
    // 记录指纹：这次推送触发的服务端 document 广播回来时按它识别回声
    try {
      lastPushedFingerprint = { at: startedAt, canon: contentFingerprint(dsl) };
    } catch { /* ignore */ }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 保存画布草稿（保存制的主通道）：定位归属会话 → 推送 → 清未保存标记。
 * 编辑器「保存」按钮、提问前自动保存、切会话「保存并离开」都走这里，
 * 避免「推送成功但未保存标记还亮着」的三处重复记账。
 */
export async function saveCanvasDraft(opts?: { source?: string }): Promise<DraftPushResult> {
  const target = resolveDraftTargetSession();
  const res = await pushCanvasDraftToSession(target, { source: opts?.source });
  if (res.ok && !res.skipped) {
    workflowDocumentStore.markSaved();
  }
  return res;
}

/**
 * 回滚并同步：本地 rollbackTo 之外，把回滚后的画布推回服务端草稿 ——
 * 否则「撤销后保存 / 撤销后继续提问」仍基于撤销前的内容。
 *
 * 返回值：
 *   true        —— 本地已回滚，服务端同步已发起（失败经 onSyncFailed 报出）
 *   false       —— 快照不存在/不可回滚，本地无变化
 *   'streaming' —— AI 正在运行。此时不做「半回滚」：本地回滚既不会同步服务端
 *                 （与 AI 的并发修改互相覆盖），又会被 AI 的下一个 document 事件
 *                 顶掉，用户只会看到「回滚了又弹回来」。调用方应先提示用户停止运行。
 */
export type RollbackResult = boolean | 'streaming';

export function rollbackCanvasTo(
  snapshotId: string,
  sessionKey: string | null | undefined,
  onSyncFailed?: (error: string) => void,
): RollbackResult {
  if (sessionRuntime.getState().streaming) return 'streaming';
  const ok = workflowDocumentStore.rollbackTo(snapshotId);
  if (!ok) return false;
  void pushCanvasDraftToSession(sessionKey, { source: 'rollback' }).then((res) => {
    if (!res.ok && !res.skipped) onSyncFailed?.(res.error || 'sync failed');
  });
  return true;
}
