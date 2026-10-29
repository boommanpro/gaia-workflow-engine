/**
 * canvas-sync 推送契约回归（2026-10-26 缩放闪回）：
 *  1. 画布表单引擎会规整序列化 → store→画布回写存在「永久漂移」，同一节点只允许推一次；
 *  2. 仅配置变化（updated）不得触发 fitView（否则用户的缩放/视野被拽回全图）；
 *  3. 新增节点仍触发 fitView（AI 搭好新图需要收敛视野）。
 */
import { describe, expect, it, beforeEach } from 'vitest';

import { canvasSync, type CanvasBinding } from '../canvas-sync';
import { workflowDocumentStore } from '../store';
import { WorkflowDocument } from '../workflow-document';
import type { DslNode, WorkflowDsl } from '../types';

/** 模拟画布表单引擎：无论 store 推什么 inputs，画布序列化永远是「规整后」的形状 */
function normalize(data: any): any {
  return { ...data, inputs: { type: 'object', properties: {} } };
}

class FakeBinding implements CanvasBinding {
  current: WorkflowDsl = { nodes: [], edges: [] };
  fitViewCalls = 0;
  createdIds: string[] = [];
  updatedIds: string[] = [];

  toJSON(): WorkflowDsl {
    return this.current;
  }
  createNode(node: DslNode) {
    this.createdIds.push(node.id);
    this.current = {
      nodes: [...this.current.nodes, { ...node, data: normalize(node.data) }],
      edges: this.current.edges,
    };
  }
  updateNode(id: string, data: Record<string, any>) {
    this.updatedIds.push(id);
    this.current = {
      nodes: this.current.nodes.map((n) => (n.id === id ? { ...n, data: normalize(data) } : n)),
      edges: this.current.edges,
    };
  }
  deleteNode(id: string) {
    this.current = { nodes: this.current.nodes.filter((n) => n.id !== id), edges: this.current.edges };
  }
  addEdge(edge: any) {
    this.current = { nodes: this.current.nodes, edges: [...this.current.edges, edge] };
  }
  removeEdge() {}
  replaceAll(dsl: WorkflowDsl) {
    this.current = dsl;
  }
  fitView() {
    this.fitViewCalls += 1;
  }
}

function storeReplace(nodes: any[]): void {
  workflowDocumentStore.replace(WorkflowDocument.fromJSON({ nodes, edges: [] } as any), {
    kind: 'replace',
    source: 'ai',
    reason: 'ai-edit',
  });
}

const nodeA = (inputs: any) => ({ id: 'a_1', type: 'end', meta: {}, data: { inputs } });

describe('canvas-sync 推送契约（缩放闪回回归）', () => {
  beforeEach(() => {
    canvasSync.detach();
    workflowDocumentStore.clear();
  });

  it('表单规整导致的永久漂移：同一节点只推一次，store 空转写不再 updateNode/fitView', () => {
    const binding = new FakeBinding();
    storeReplace([nodeA({ result: { type: 'string' } })]);
    canvasSync.attach(binding);

    // 挂载首推：store→画布，漂移在此产生（画布规整掉 inputs 内容）
    expect(binding.updatedIds).toEqual([]);
    expect(binding.createdIds).toEqual(['a_1']);

    // 服务端回声：同内容整份重写（revision 前进，内容不变）→ 不得再推同一节点
    storeReplace([nodeA({ result: { type: 'string' } })]);
    expect(binding.updatedIds).toEqual([]);
    expect(binding.fitViewCalls).toBe(1); // 仅挂载时「新增节点」fit 过一次

    // store 数据真的变了（AI 改配置）→ 照常推送
    storeReplace([nodeA({ result: { type: 'number' } })]);
    expect(binding.updatedIds).toEqual(['a_1']);
  });

  it('仅配置变化（updated）不触发 fitView；新增节点才触发', () => {
    const binding = new FakeBinding();
    storeReplace([nodeA({ result: { type: 'string' } })]);
    canvasSync.attach(binding);
    const afterMount = binding.fitViewCalls;

    // 配置变化（推送后签名不同 → 真更新）
    storeReplace([nodeA({ result: { type: 'number' } })]);
    expect(binding.updatedIds).toEqual(['a_1']);
    expect(binding.fitViewCalls).toBe(afterMount);

    // 新增节点 → 收敛视野
    storeReplace([
      nodeA({ result: { type: 'number' } }),
      { id: 'b_1', type: 'code', meta: {}, data: {} },
    ]);
    expect(binding.createdIds).toEqual(['a_1', 'b_1']);
    expect(binding.fitViewCalls).toBe(afterMount + 1);
  });
});
