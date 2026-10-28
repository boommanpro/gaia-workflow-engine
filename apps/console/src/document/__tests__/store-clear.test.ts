/**
 * store.clear 的持久化语义回归（2026-10-27 切会话误删快照修复）：
 *  · wipePersisted:true —— 同 scope 换工作流，快照历史确实要丢弃时才删 IndexedDB；
 *  · 默认（无参）—— 会话切换路径：谁的历史都不删。旧实现无条件 saveSnapshots(scope, null)，
 *    而切会话时 scope 已指向新会话，等于每次切换都把新会话的本地快照历史抹掉。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveSnapshotsMock = vi.hoisted(() => vi.fn());

vi.mock('../idb', () => ({
  loadSnapshots: vi.fn(async () => null),
  saveSnapshots: (...args: unknown[]) => {
    saveSnapshotsMock(...args);
    return Promise.resolve();
  },
}));

import { WorkflowDocument } from '../workflow-document';
import { workflowDocumentStore } from '../store';

const dslOf = () => ({
  nodes: [
    { id: 'start_1', type: 'start', data: { title: 'Start' }, meta: { position: { x: 1, y: 1 } } },
  ],
  edges: [],
});

describe('workflowDocumentStore.clear 持久化语义', () => {
  beforeEach(() => {
    saveSnapshotsMock.mockClear();
  });

  it('wipePersisted:true 删除当前 scope 的快照历史', () => {
    workflowDocumentStore.setScope('sess-A');
    workflowDocumentStore.replace(WorkflowDocument.fromJSON(dslOf() as any), {
      kind: 'replace',
      source: 'system',
      reason: 'import',
    });
    workflowDocumentStore.clear({ wipePersisted: true });
    expect(saveSnapshotsMock).toHaveBeenCalledWith('sess-A', null);
  });

  it('默认不清持久层：切会话路径不再误删（新/旧 scope 都不删）', () => {
    workflowDocumentStore.setScope('sess-B');
    workflowDocumentStore.replace(WorkflowDocument.fromJSON(dslOf() as any), {
      kind: 'replace',
      source: 'system',
      reason: 'import',
    });
    workflowDocumentStore.clear();
    expect(saveSnapshotsMock).not.toHaveBeenCalledWith('sess-B', null);
    expect(saveSnapshotsMock).not.toHaveBeenCalledWith('sess-A', null);
    expect(workflowDocumentStore.getSnapshot().doc.isEmpty).toBe(true);
  });
});
