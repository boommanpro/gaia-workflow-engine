import { describe, expect, it } from 'vitest';

import { migrateMultiConditionToBranches } from '../migrations';

describe('migrateMultiConditionToBranches', () => {
  const multiConditionDoc = {
    nodes: [
      {
        id: 'start_0',
        type: 'start',
        data: { outputs: { type: 'object', properties: {} } },
      },
      {
        id: 'mc_0',
        type: 'multi-condition',
        data: {
          title: '多条件',
          branch: [
            {
              logic: 'and',
              conditions: [
                { key: 'cond_aaa', value: { type: 'expression', content: 'x > 1' } },
              ],
            },
            {
              logic: 'or',
              conditions: [
                { key: 'cond_bbb', value: { type: 'expression', content: 'y < 2' } },
              ],
            },
          ],
          else: true,
        },
      },
    ],
    edges: [
      { sourceNodeID: 'start_0', targetNodeID: 'mc_0' },
      { sourceNodeID: 'mc_0', targetNodeID: 'end_a', sourcePortID: 'cond_aaa' },
      { sourceNodeID: 'mc_0', targetNodeID: 'end_b', sourcePortID: 'cond_bbb' },
      { sourceNodeID: 'mc_0', targetNodeID: 'end_c', sourcePortID: 'else' },
    ],
  };

  it('multi-condition 节点迁移为 branches，data.branch 改名且清掉 else 表单项', () => {
    const result = migrateMultiConditionToBranches(multiConditionDoc as any);
    const migrated = result.nodes.find((n: any) => n.id === 'mc_0')!;
    expect(migrated.type).toBe('branches');
    const branches = (migrated.data as any).branches;
    expect(branches).toHaveLength(2);
    expect(branches[0]).toMatchObject({ id: 'branch_1', logic: 'and' });
    expect(branches[1]).toMatchObject({ id: 'branch_2', logic: 'or' });
    expect(branches[0].conditions[0].key).toBe('cond_aaa');
    expect((migrated.data as any).branch).toBeUndefined();
    expect((migrated.data as any).else).toBeUndefined();
  });

  it('出边端口从 condition key 重映射为 branch id，else 不变', () => {
    const result = migrateMultiConditionToBranches(multiConditionDoc as any);
    const ports = result.edges
      .filter((e: any) => e.sourceNodeID === 'mc_0')
      .map((e: any) => e.sourcePortID);
    expect(ports).toEqual(['branch_1', 'branch_2', 'else']);
  });

  it('可重入：迁移过的文档再跑一遍结果不变', () => {
    const once = migrateMultiConditionToBranches(multiConditionDoc as any);
    const twice = migrateMultiConditionToBranches(once);
    expect(twice).toEqual(once);
  });

  it('无 multi-condition 的文档原样返回（引用不变）', () => {
    const doc = { nodes: [{ id: 'a', type: 'start', data: {} }], edges: [] };
    expect(migrateMultiConditionToBranches(doc as any)).toBe(doc);
  });
});

describe('migrateLegacyDsl（载入统一入口）', () => {
  it('完整文档经 fromJSON 语义迁移（workflow-document 集成）', async () => {
    const { WorkflowDocument } = await import('../workflow-document');
    const doc = WorkflowDocument.fromJSON(JSON.stringify({
      nodes: [
        { id: 'mc_0', type: 'multi-condition', data: { branch: [{ logic: 'and', conditions: [{ key: 'k1', value: {} }] }] } },
      ],
      edges: [{ sourceNodeID: 'mc_0', targetNodeID: 'end_0', sourcePortID: 'k1' }],
    }));
    expect(doc.dsl.nodes[0].type).toBe('branches');
    expect(doc.dsl.edges[0].sourcePortID).toBe('branch_1');
  });
});
