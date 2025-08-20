/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { WorkflowSchema, FlowGramNode } from '@flowgram.ai/runtime-interface';

import { startEndNode } from './start-end-node';

describe('startEndNode', () => {
  const createMockNode = (id: string, type: string) => ({
    id,
    type,
    meta: { position: { x: 0, y: 0 } },
    data: {},
  });

  describe('valid scenarios', () => {
    it('should not throw error when schema has exactly one start and one end node', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          createMockNode('middle1', 'custom'),
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).not.toThrow();
    });

    it('should not throw error when schema has start, end nodes and nested blocks with block-start/block-end', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('block-start1', FlowGramNode.BlockStart),
              createMockNode('custom1', 'custom'),
              createMockNode('block-end1', FlowGramNode.BlockEnd),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).not.toThrow();
    });
  });

  describe('missing start and end nodes', () => {
    it('should throw error when schema has no start and no end nodes', () => {
      const schema: WorkflowSchema = {
        nodes: [createMockNode('middle1', 'custom')],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow schema must have a start node and an end node'
      );
    });
  });

  describe('missing start node', () => {
    it('should throw error when schema has no start node', () => {
      const schema: WorkflowSchema = {
        nodes: [createMockNode('middle1', 'custom'), createMockNode('end1', FlowGramNode.End)],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow('Workflow schema must have a start node');
    });
  });

  describe('missing end node', () => {
    it('should throw error when schema has no end node', () => {
      const schema: WorkflowSchema = {
        nodes: [createMockNode('start1', FlowGramNode.Start), createMockNode('middle1', 'custom')],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow('Workflow schema must have an end node');
    });
  });

  describe('multiple start nodes', () => {
    it('should throw error when schema has multiple start nodes', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          createMockNode('start2', FlowGramNode.Start),
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow('Workflow schema must have only one start node');
    });
  });

  describe('multiple end nodes', () => {
    it('should throw error when schema has multiple end nodes', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          createMockNode('end1', FlowGramNode.End),
          createMockNode('end2', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow('Workflow schema must have only one end node');
    });
  });

  describe('nested block validation', () => {
    it('should throw error when nested block has no block-start node', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('custom1', 'custom'),
              createMockNode('block-end1', FlowGramNode.BlockEnd),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have a block-start node'
      );
    });

    it('should throw error when nested block has no block-end node', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('block-start1', FlowGramNode.BlockStart),
              createMockNode('custom1', 'custom'),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have an block-end node'
      );
    });

    it('should throw error when nested block has multiple block-start nodes', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('block-start1', FlowGramNode.BlockStart),
              createMockNode('block-start2', FlowGramNode.BlockStart),
              createMockNode('block-end1', FlowGramNode.BlockEnd),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have only one block-start node'
      );
    });

    it('should throw error when nested block has multiple block-end nodes', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('block-start1', FlowGramNode.BlockStart),
              createMockNode('block-end1', FlowGramNode.BlockEnd),
              createMockNode('block-end2', FlowGramNode.BlockEnd),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have only one block-end node'
      );
    });

    it('should throw error when nested block has no block-start and no block-end nodes', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [createMockNode('custom1', 'custom')],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have a block-start node and a block-end node'
      );
    });
  });

  describe('deeply nested blocks', () => {
    it('should validate deeply nested blocks recursively', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('block-start1', FlowGramNode.BlockStart),
              {
                id: 'nested-loop',
                type: FlowGramNode.Loop,
                meta: { position: { x: 0, y: 0 } },
                data: {},
                blocks: [
                  createMockNode('nested-block-start', FlowGramNode.BlockStart),
                  createMockNode('nested-custom', 'custom'),
                  createMockNode('nested-block-end', FlowGramNode.BlockEnd),
                ],
                edges: [],
              },
              createMockNode('block-end1', FlowGramNode.BlockEnd),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).not.toThrow();
    });

    it('should throw error for invalid deeply nested blocks', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [
              createMockNode('block-start1', FlowGramNode.BlockStart),
              {
                id: 'nested-loop',
                type: FlowGramNode.Loop,
                meta: { position: { x: 0, y: 0 } },
                data: {},
                blocks: [
                  // Missing nested block-start node
                  createMockNode('nested-custom', 'custom'),
                  createMockNode('nested-block-end', FlowGramNode.BlockEnd),
                ],
                edges: [],
              },
              createMockNode('block-end1', FlowGramNode.BlockEnd),
            ],
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have a block-start node'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty nodes array', () => {
      const schema: WorkflowSchema = {
        nodes: [],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow schema must have a start node and an end node'
      );
    });

    it('should handle nodes without blocks property', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'custom1',
            type: 'custom',
            meta: { position: { x: 0, y: 0 } },
            data: {},
            // No blocks property
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).not.toThrow();
    });

    it('should handle nodes with empty blocks array', () => {
      const schema: WorkflowSchema = {
        nodes: [
          createMockNode('start1', FlowGramNode.Start),
          {
            id: 'loop1',
            type: FlowGramNode.Loop,
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: [], // Empty blocks
            edges: [],
          },
          createMockNode('end1', FlowGramNode.End),
        ],
        edges: [],
      };

      expect(() => startEndNode(schema)).toThrow(
        'Workflow block schema must have a block-start node and a block-end node'
      );
    });
  });
});
