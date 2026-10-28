/**
 * 画布草稿保存链路回归（2026-10-27 保存制）：
 *  · resolveDraftTargetSession —— 画布归属会话（ownerSession）优先，workflowCode 反查兜底；
 *    AI 全新生成、从未「保存为版本」的草稿没有 workflowCode，靠编码反查必然为空，
 *    手改同步曾在整个「对话 → 精修」主流程上静默失效（批次 2.6 修复，回归钉子）。
 *  · saveCanvasDraft —— 保存制主通道：推送成功即清「未保存」标记；跳过/失败不清。
 *  · hasUnsyncedLocalEdits —— 数据源是 store 的 dirtySinceSave（保存制下「未同步」=「未保存」）。
 *  · pushCanvasDraftToSession —— 跳过语义与回声指纹记账。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { workflowDocumentStore } from '../../document';
import { WorkflowDocument } from '../../document/workflow-document';
import {
  hasUnsyncedLocalEdits,
  isEchoOfLastPush,
  pushCanvasDraftToSession,
  resolveDraftTargetSession,
  saveCanvasDraft,
} from '../canvas-draft-sync';

const pushDraft = vi.hoisted(() => vi.fn());

vi.mock('../api', () => ({
  agentApi: { pushDraft: (...args: unknown[]) => pushDraft(...args) },
}));

// session-scope 的绑定表走 localStorage；node 环境补一个内存桩
const localStorageMap: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => localStorageMap[k] ?? null,
  setItem: (k: string, v: string) => {
    localStorageMap[k] = String(v);
  },
  removeItem: (k: string) => {
    delete localStorageMap[k];
  },
};

const dslOf = () => ({
  nodes: [
    { id: 'start_1', type: 'start', data: { title: 'Start' }, meta: { position: { x: 100, y: 100 } } },
  ],
  edges: [],
});

function seedCanvas(ownerSession?: string, workflowCode?: string): void {
  workflowDocumentStore.clear();
  workflowDocumentStore.replace(WorkflowDocument.fromJSON(dslOf() as any), {
    kind: 'replace',
    source: 'system',
    reason: 'import',
  });
  workflowDocumentStore.setMeta({
    ...(ownerSession !== undefined ? { ownerSession } : {}),
    ...(workflowCode !== undefined ? { workflowCode } : {}),
  });
  workflowDocumentStore.markSaved();
}

/** 造一次用户修改（换 doc 引用避免 commit 早退；挪坐标=纯布局，不产生快照） */
function markDirty(): void {
  const json = workflowDocumentStore.getSnapshot().doc.toJSON();
  const node = json.nodes[0];
  const pos = node.meta?.position ?? { x: 0, y: 0 };
  node.meta = { ...node.meta, position: { x: pos.x + 10, y: pos.y + 10 } };
  workflowDocumentStore.replace(WorkflowDocument.fromJSON(json as any), {
    kind: 'layout',
    source: 'user',
    reason: 'user-layout',
  });
}

describe('resolveDraftTargetSession', () => {
  it('归属会话优先：未落版草稿（无 workflowCode）也能定位推送目标', () => {
    seedCanvas('sess-1');
    expect(resolveDraftTargetSession()).toBe('sess-1');
  });

  it('draft- 伪会话不作为推送目标，继续走编码反查兜底', () => {
    localStorageMap['gaia.sessionWorkflowBinding'] = JSON.stringify({ 'sess-9': 'wf_a' });
    seedCanvas('draft-1', 'wf_a');
    expect(resolveDraftTargetSession()).toBe('sess-9');
  });

  it('归属与编码都没有：返回 null（调用方按 no-session 跳过）', () => {
    seedCanvas(undefined, undefined);
    expect(resolveDraftTargetSession()).toBeNull();
  });
});

describe('saveCanvasDraft（保存制主通道）', () => {
  beforeEach(() => {
    pushDraft.mockReset();
    pushDraft.mockResolvedValue({ success: true });
  });

  it('保存成功：推送归属会话并清除未保存标记', async () => {
    seedCanvas('sess-1');
    // 模拟一次用户手改（含纯布局）
    workflowDocumentStore.replace(WorkflowDocument.fromJSON({
      nodes: [{ id: 'start_1', type: 'start', data: { title: 'Start' }, meta: { position: { x: 222, y: 333 } } }],
      edges: [],
    } as any), { kind: 'layout', source: 'user', reason: 'user-layout' });
    expect(hasUnsyncedLocalEdits()).toBe(true);

    const res = await saveCanvasDraft({ source: 'manual-save' });
    expect(res).toMatchObject({ ok: true });
    const [sessionKey, body] = pushDraft.mock.calls[0];
    expect(sessionKey).toBe('sess-1');
    expect((body as any).source).toBe('manual-save');
    expect((body as any).dsl.nodes[0].meta.position).toMatchObject({ x: 222, y: 333 });
    expect(hasUnsyncedLocalEdits()).toBe(false);
  });

  it('保存失败：未保存标记保留（数据不丢的可见性）', async () => {
    seedCanvas('sess-1');
    markDirty();
    expect(hasUnsyncedLocalEdits()).toBe(true);
    pushDraft.mockResolvedValue({ success: false, error: 'boom' });

    const res = await saveCanvasDraft({ source: 'manual-save' });
    expect(res).toMatchObject({ ok: false, error: 'boom' });
    expect(hasUnsyncedLocalEdits()).toBe(true);
  });

  it('跳过（无归属会话）：不清未保存标记', async () => {
    seedCanvas(undefined);
    markDirty();
    const res = await saveCanvasDraft({ source: 'manual-save' });
    expect(res).toMatchObject({ ok: true, skipped: true, reason: 'no-session' });
    expect(hasUnsyncedLocalEdits()).toBe(true);
  });
});

describe('hasUnsyncedLocalEdits（store 未保存语义）', () => {
  it('用户结构修改置位、markSaved 清除；系统加载不置位', () => {
    seedCanvas('sess-1');
    expect(hasUnsyncedLocalEdits()).toBe(false);

    markDirty();
    expect(hasUnsyncedLocalEdits()).toBe(true);

    workflowDocumentStore.markSaved();
    expect(hasUnsyncedLocalEdits()).toBe(false);

    workflowDocumentStore.replace(WorkflowDocument.fromJSON(dslOf() as any), {
      kind: 'replace',
      source: 'system',
      reason: 'import',
    });
    expect(hasUnsyncedLocalEdits()).toBe(false);
  });

  it('AI 修改置位：未保存期间后续 AI 事件应走待应用变更拦截', () => {
    seedCanvas('sess-1');
    const json = workflowDocumentStore.getSnapshot().doc.toJSON();
    json.nodes[0].data = { ...json.nodes[0].data, title: 'AI改过' };
    workflowDocumentStore.replace(WorkflowDocument.fromJSON(json as any), {
      kind: 'replace',
      source: 'ai',
      reason: 'ai-edit',
    });
    expect(hasUnsyncedLocalEdits()).toBe(true);
  });
});

describe('pushCanvasDraftToSession', () => {
  beforeEach(() => {
    pushDraft.mockReset();
    pushDraft.mockResolvedValue({ success: true });
  });

  it('无会话跳过不算失败；空画布跳过', async () => {
    seedCanvas(undefined);
    await expect(pushCanvasDraftToSession(null)).resolves.toMatchObject({
      ok: true, skipped: true, reason: 'no-session',
    });

    workflowDocumentStore.clear();
    await expect(pushCanvasDraftToSession('sess-1')).resolves.toMatchObject({
      ok: true, skipped: true, reason: 'empty',
    });
  });

  it('推成功后记录回声指纹：同内容广播回来判为回声', async () => {
    seedCanvas('sess-1');
    const dsl = dslOf();
    const res = await pushCanvasDraftToSession('sess-1', { source: 'ask', dsl });
    expect(res).toMatchObject({ ok: true });
    expect(isEchoOfLastPush(dsl)).toBe(true);
    expect(isEchoOfLastPush({ nodes: [], edges: [] })).toBe(false);
  });
});
