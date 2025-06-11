import { describe, expect, it } from 'vitest';
import { FlowGramNode, WorkflowSchema } from '@flowgram.ai/runtime-interface';

import { flatSchema } from './flat-schema';

describe('flatSchema', () => {
  it('should handle empty schema', () => {
    const result = flatSchema({});
    expect(result.flattenSchema.nodes).toEqual([]);
    expect(result.flattenSchema.edges).toEqual([]);
    expect(result.nodeBlocks.get(FlowGramNode.Root)).toEqual([]);
    expect(result.nodeEdges.get(FlowGramNode.Root)).toEqual([]);
  });

  it('should handle basic schema without nested blocks', () => {
    const schema = {
      nodes: [
        { id: 'node1', type: 'test' },
        { id: 'node2', type: 'test' },
      ],
      edges: [{ sourceNodeID: 'node1', targetNodeID: 'node2' }],
    } as unknown as WorkflowSchema;

    const result = flatSchema(schema);
    expect(result.flattenSchema.nodes).toEqual(schema.nodes);
    expect(result.flattenSchema.edges).toEqual(schema.edges);
    expect(result.nodeBlocks.get(FlowGramNode.Root)).toEqual(['node1', 'node2']);
    expect(result.nodeEdges.get(FlowGramNode.Root)).toEqual(['node1-node2']);
  });

  it('should flatten nested blocks and edges', () => {
    const schema = {
      nodes: [
        {
          id: 'parent',
          type: 'container',
          blocks: [
            { id: 'child1', type: 'test' },
            {
              id: 'child2',
              type: 'test',
              blocks: [{ id: 'grandchild', type: 'test' }],
              edges: [{ sourceNodeID: 'child2', targetNodeID: 'grandchild' }],
            },
          ],
          edges: [{ sourceNodeID: 'child1', targetNodeID: 'child2' }],
        },
      ],
      edges: [],
    } as unknown as WorkflowSchema;

    const result = flatSchema(schema);

    // 验证节点被正确展平
    expect(result.flattenSchema.nodes.map((n) => n.id)).toEqual([
      'parent',
      'child1',
      'child2',
      'grandchild',
    ]);

    // 验证边被正确展平
    expect(result.flattenSchema.edges.length).toBe(2);

    // 验证节点关系映射
    expect(result.nodeBlocks.get('parent')).toEqual(['child1', 'child2']);
    expect(result.nodeBlocks.get('child2')).toEqual(['grandchild']);

    // 验证边关系映射
    expect(result.nodeEdges.get('parent')).toEqual(['child1-child2']);
    expect(result.nodeEdges.get('child2')).toEqual(['child2-grandchild']);
  });
});
