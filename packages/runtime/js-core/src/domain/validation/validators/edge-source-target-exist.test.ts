/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

import { edgeSourceTargetExist } from './edge-source-target-exist';

describe('edgeSourceTargetExist', () => {
  const createMockNode = (id: string, type: string = 'test') => ({
    id,
    type,
    meta: { position: { x: 0, y: 0 } },
    data: {},
  });

  const createMockEdge = (sourceNodeID: string, targetNodeID: string) => ({
    sourceNodeID,
    targetNodeID,
  });

  it('should not throw error when all edge nodes exist', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B'), createMockNode('C')],
      edges: [createMockEdge('A', 'B'), createMockEdge('B', 'C')],
    };

    expect(() => edgeSourceTargetExist(schema)).not.toThrow();
  });

  it('should not throw error for empty edges', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B')],
      edges: [],
    };

    expect(() => edgeSourceTargetExist(schema)).not.toThrow();
  });

  it('should throw error when source node does not exist', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B')],
      edges: [createMockEdge('C', 'A')], // 'C' does not exist
    };

    expect(() => edgeSourceTargetExist(schema)).toThrow(
      'Workflow schema edge source node "C" not exist'
    );
  });

  it('should throw error when target node does not exist', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B')],
      edges: [createMockEdge('A', 'C')], // 'C' does not exist
    };

    expect(() => edgeSourceTargetExist(schema)).toThrow(
      'Workflow schema edge target node "C" not exist'
    );
  });

  it('should validate edges in nested blocks', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('root'),
        {
          ...createMockNode('parent', 'container'),
          blocks: [createMockNode('child1'), createMockNode('child2')],
          edges: [createMockEdge('child1', 'child2')],
        },
      ],
      edges: [createMockEdge('root', 'parent')],
    };

    expect(() => edgeSourceTargetExist(schema)).not.toThrow();
  });

  it('should throw error when nested edge source node does not exist', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('root'),
        {
          ...createMockNode('parent', 'container'),
          blocks: [createMockNode('child1'), createMockNode('child2')],
          edges: [createMockEdge('nonexistent', 'child2')], // 'nonexistent' does not exist in blocks
        },
      ],
      edges: [createMockEdge('root', 'parent')],
    };

    expect(() => edgeSourceTargetExist(schema)).toThrow(
      'Workflow schema edge source node "nonexistent" not exist'
    );
  });

  it('should throw error when nested edge target node does not exist', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('root'),
        {
          ...createMockNode('parent', 'container'),
          blocks: [createMockNode('child1'), createMockNode('child2')],
          edges: [createMockEdge('child1', 'nonexistent')], // 'nonexistent' does not exist in blocks
        },
      ],
      edges: [createMockEdge('root', 'parent')],
    };

    expect(() => edgeSourceTargetExist(schema)).toThrow(
      'Workflow schema edge target node "nonexistent" not exist'
    );
  });

  it('should handle deeply nested structures', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('root'),
        {
          ...createMockNode('level1', 'container'),
          blocks: [
            createMockNode('child1'),
            {
              ...createMockNode('level2', 'container'),
              blocks: [createMockNode('grandchild1'), createMockNode('grandchild2')],
              edges: [createMockEdge('grandchild1', 'grandchild2')],
            },
          ],
          edges: [createMockEdge('child1', 'level2')],
        },
      ],
      edges: [createMockEdge('root', 'level1')],
    };

    expect(() => edgeSourceTargetExist(schema)).not.toThrow();
  });

  it('should handle nodes without blocks or edges', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('A'),
        createMockNode('B'),
        {
          ...createMockNode('C', 'container'),
          // No blocks or edges defined
        },
      ],
      edges: [createMockEdge('A', 'B'), createMockEdge('B', 'C')],
    };

    expect(() => edgeSourceTargetExist(schema)).not.toThrow();
  });
});
