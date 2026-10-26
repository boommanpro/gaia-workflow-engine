/**
 * headless DSL 校验（validateDsl）的 start/end 基数规则 + WorkflowDocument.addNode 的唯一性守卫。
 *
 * 2026-10-26 用户实证：前后端都能出现多个 end。出口唯一与入口唯一对称（后端 WorkflowDslValidator
 * MULTI_START / MULTI_END 同口径）；条件/分支的各路径汇合到同一个 end。
 */
import { describe, expect, it } from 'vitest';

import { validateDsl } from '../validate';
import { WorkflowDocument } from '../workflow-document';
import type { WorkflowDsl } from '../types';

const start = { id: 'start_1', type: 'start', data: { title: '开始', outputs: { type: 'object', properties: { q: { type: 'string' } } } } };
const condition = {
  id: 'condition_1',
  type: 'condition',
  data: {
    title: '判断',
    conditions: [{ key: 'if_match', value: { left: { type: 'ref', content: ['start_1', 'q'] }, operator: 'contains', right: { type: 'constant', content: 'x' } } }],
  },
};
const endNode = (id: string) => ({
  id,
  type: 'end',
  data: { title: '结束', inputsValues: { out: { type: 'ref', content: ['start_1', 'q'] } } },
});

describe('validateDsl：start/end 基数', () => {
  it('两个 end → MULTI_END error（分支各接一个 end 的旧写法被打回）', () => {
    const dsl: WorkflowDsl = {
      nodes: [start, condition, endNode('end_1'), endNode('end_2')],
      edges: [
        { sourceNodeID: 'start_1', targetNodeID: 'condition_1' },
        { sourceNodeID: 'condition_1', targetNodeID: 'end_1', sourcePortID: 'if_match' },
        { sourceNodeID: 'condition_1', targetNodeID: 'end_2', sourcePortID: 'else' },
      ],
    };
    const result = validateDsl(dsl);
    const multiEnd = result.errors.find((i) => i.code === 'MULTI_END');
    expect(multiEnd).toBeTruthy();
    expect(multiEnd?.message).toContain('2 个 end');
    expect(result.valid).toBe(false);
  });

  it('分支汇合到同一个 end → 无 MULTI_END，整图 valid', () => {
    const dsl: WorkflowDsl = {
      nodes: [start, condition, endNode('end_1')],
      edges: [
        { sourceNodeID: 'start_1', targetNodeID: 'condition_1' },
        { sourceNodeID: 'condition_1', targetNodeID: 'end_1', sourcePortID: 'if_match' },
        { sourceNodeID: 'condition_1', targetNodeID: 'end_1', sourcePortID: 'else' },
      ],
    };
    const result = validateDsl(dsl);
    expect(result.issues.some((i) => i.code === 'MULTI_END')).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('两个 start → MULTI_START error（既有口径不变）；缺 end 仍是 warning（草稿可不完整）', () => {
    const twoStarts = validateDsl({
      nodes: [start, { ...start, id: 'start_2' }, endNode('end_1')],
      edges: [{ sourceNodeID: 'start_1', targetNodeID: 'end_1' }],
    });
    expect(twoStarts.errors.some((i) => i.code === 'MULTI_START')).toBe(true);

    const noEnd = validateDsl({ nodes: [start], edges: [] });
    expect(noEnd.warnings.some((i) => i.code === 'NO_END')).toBe(true);
    expect(noEnd.errors.some((i) => i.code === 'MULTI_END')).toBe(false);
  });
});

describe('WorkflowDocument.addNode：start/end 唯一性守卫', () => {
  it('已有 end 时再 addNode(end) 返回原实例，节点数不变', () => {
    const doc = new WorkflowDocument({ nodes: [start, endNode('end_1')], edges: [] });
    const next = doc.addNode('end');
    expect(next).toBe(doc);
    expect(next.nodes.filter((n) => n.type === 'end')).toHaveLength(1);
  });

  it('没有 end 时可以添加；删除后可再添加', () => {
    const doc = new WorkflowDocument({ nodes: [start], edges: [] });
    const withEnd = doc.addNode('end');
    expect(withEnd.nodes.filter((n) => n.type === 'end')).toHaveLength(1);
    const added = withEnd.nodes.find((n) => n.type === 'end')!;
    // deleteNode 对 start/end 拒绝，走「唯一性是同时只能一个」的替代验证：新文档不含 end 时可再加
    const fresh = new WorkflowDocument({ nodes: withEnd.nodes.filter((n) => n.id !== added.id), edges: [] });
    expect(fresh.addNode('end').nodes.filter((n) => n.type === 'end')).toHaveLength(1);
  });
});
