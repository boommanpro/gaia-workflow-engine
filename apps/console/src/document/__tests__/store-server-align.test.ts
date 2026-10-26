/**
 * store 服务端对账回归（2026-10-25 会话 84bf1596 幽灵节点报告驱动）：
 * · applyServerDoc 全量替换后 serverDocVersion 记录到位；
 * · alignServerDocVersion 仅对齐版本号不触内容（连接对账的结构一致分支）——
 *   后端重启会重置草稿版本计数，不重对齐的话后续增量 ops 的 baseVersion 永远对不上；
 * · applyServerOps 在版本对齐后可正确增量应用（对账闭环）。
 */
import { describe, expect, it } from 'vitest';

import { workflowDocumentStore } from '../store';

const dslOf = (nodeIds: string[]) => ({
  nodes: nodeIds.map((id, i) => ({
    id,
    type: id.startsWith('start') ? 'start' : 'code',
    data: { title: id },
    meta: { position: { x: 100 * (i + 1), y: 100 } },
  })),
  edges: [],
});

describe('workflowDocumentStore server alignment', () => {
  it('applyServerDoc 记录版本并全量替换', () => {
    workflowDocumentStore.clear();
    workflowDocumentStore.applyServerDoc(dslOf(['start_1', 'code_1']) as any, 5);
    const snap = workflowDocumentStore.getSnapshot();
    expect(snap.doc.nodes.map((n) => n.id)).toEqual(['start_1', 'code_1']);
    expect(snap.serverDocVersion).toBe(5);
    workflowDocumentStore.clear();
  });

  it('alignServerDocVersion 只动版本号，不触内容；0/相同值不产生变更', () => {
    workflowDocumentStore.clear();
    workflowDocumentStore.applyServerDoc(dslOf(['start_1', 'code_1']) as any, 5);
    const before = workflowDocumentStore.getSnapshot();
    const beforeJson = JSON.stringify(before.doc.toJSON());

    workflowDocumentStore.alignServerDocVersion(0); // 非法值忽略
    workflowDocumentStore.alignServerDocVersion(5); // 相同值忽略
    expect(workflowDocumentStore.getSnapshot().serverDocVersion).toBe(5);
    expect(JSON.stringify(workflowDocumentStore.getSnapshot().doc.toJSON())).toBe(beforeJson);
    expect(workflowDocumentStore.getSnapshot().revision).toBe(before.revision);

    workflowDocumentStore.alignServerDocVersion(2); // 后端重启重置：对齐到 2
    expect(workflowDocumentStore.getSnapshot().serverDocVersion).toBe(2);
    expect(JSON.stringify(workflowDocumentStore.getSnapshot().doc.toJSON())).toBe(beforeJson);
    workflowDocumentStore.clear();
  });

  it('对账闭环：版本重置对齐后，增量 ops（baseVersion 匹配）可正确应用', () => {
    workflowDocumentStore.clear();
    workflowDocumentStore.applyServerDoc(dslOf(['start_1', 'code_1']) as any, 41);
    // 模拟长活 tab：本地版本 41，后端重启后 op 从 baseVersion=1 开始
    workflowDocumentStore.alignServerDocVersion(1);
    const applied = workflowDocumentStore.applyServerOps(
      [{ op: 'node_set', node: { id: 'llm_2', type: 'llm', data: { title: '新节点' }, meta: { position: { x: 1, y: 1 } } } }],
      2
    );
    expect(applied).toBe(true);
    const snap = workflowDocumentStore.getSnapshot();
    expect(snap.doc.nodes.map((n) => n.id)).toContain('llm_2');
    expect(snap.serverDocVersion).toBe(2);
    workflowDocumentStore.clear();
  });

  it('版本不匹配时 applyServerOps 拒绝应用（store 级门禁，防调用方漏检写错基线）', () => {
    workflowDocumentStore.clear();
    workflowDocumentStore.applyServerDoc(dslOf(['start_1']) as any, 41);
    const applied = workflowDocumentStore.applyServerOps(
      [{ op: 'node_set', node: { id: 'ghost', type: 'code', data: {}, meta: { position: { x: 1, y: 1 } } } }],
      2,
      1 // baseVersion=1 ≠ 本地 41：门禁拒绝
    );
    expect(applied).toBe(false);
    expect(workflowDocumentStore.getSnapshot().doc.nodes.map((n) => n.id)).toEqual(['start_1']);
    workflowDocumentStore.clear();
  });
});

