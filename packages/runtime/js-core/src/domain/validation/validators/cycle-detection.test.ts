/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

import { cycleDetection } from './cycle-detection';

describe('cycleDetection', () => {
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

  it('should not throw error for acyclic graph', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B'), createMockNode('C')],
      edges: [createMockEdge('A', 'B'), createMockEdge('B', 'C')],
    };

    expect(() => cycleDetection(schema)).not.toThrow();
  });

  it('should throw error for simple cycle', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B'), createMockNode('C')],
      edges: [
        createMockEdge('A', 'B'),
        createMockEdge('B', 'C'),
        createMockEdge('C', 'A'), // Creates a cycle
      ],
    };

    expect(() => cycleDetection(schema)).toThrow(
      'Workflow schema contains a cycle, which is not allowed'
    );
  });

  it('should throw error for self-loop', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B')],
      edges: [
        createMockEdge('A', 'B'),
        createMockEdge('B', 'B'), // Self-loop
      ],
    };

    expect(() => cycleDetection(schema)).toThrow(
      'Workflow schema contains a cycle, which is not allowed'
    );
  });

  it('should handle disconnected components without cycles', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B'), createMockNode('C'), createMockNode('D')],
      edges: [createMockEdge('A', 'B'), createMockEdge('C', 'D')],
    };

    expect(() => cycleDetection(schema)).not.toThrow();
  });

  it('should detect cycle in disconnected components', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B'), createMockNode('C'), createMockNode('D')],
      edges: [
        createMockEdge('A', 'B'),
        createMockEdge('C', 'D'),
        createMockEdge('D', 'C'), // Creates a cycle in second component
      ],
    };

    expect(() => cycleDetection(schema)).toThrow(
      'Workflow schema contains a cycle, which is not allowed'
    );
  });

  it('should handle empty schema', () => {
    const schema: WorkflowSchema = {
      nodes: [],
      edges: [],
    };

    expect(() => cycleDetection(schema)).not.toThrow();
  });

  it('should handle schema with nodes but no edges', () => {
    const schema: WorkflowSchema = {
      nodes: [createMockNode('A'), createMockNode('B'), createMockNode('C')],
      edges: [],
    };

    expect(() => cycleDetection(schema)).not.toThrow();
  });

  it('should detect cycles in nested blocks', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('A'),
        {
          id: 'B',
          type: 'container',
          meta: { position: { x: 0, y: 0 } },
          data: {},
          blocks: [createMockNode('B1'), createMockNode('B2')],
          edges: [
            createMockEdge('B1', 'B2'),
            createMockEdge('B2', 'B1'), // Creates a cycle in nested blocks
          ],
        },
      ],
      edges: [createMockEdge('A', 'B')],
    };

    expect(() => cycleDetection(schema)).toThrow(
      'Workflow schema contains a cycle, which is not allowed'
    );
  });

  it('should handle nested blocks without cycles', () => {
    const schema: WorkflowSchema = {
      nodes: [
        createMockNode('A'),
        {
          id: 'B',
          type: 'container',
          meta: { position: { x: 0, y: 0 } },
          data: {},
          blocks: [createMockNode('B1'), createMockNode('B2'), createMockNode('B3')],
          edges: [createMockEdge('B1', 'B2'), createMockEdge('B2', 'B3')],
        },
      ],
      edges: [createMockEdge('A', 'B')],
    };

    expect(() => cycleDetection(schema)).not.toThrow();
  });
});
