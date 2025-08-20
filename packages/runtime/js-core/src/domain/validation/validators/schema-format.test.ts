/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

import { schemaFormat } from './schema-format';

describe('schemaFormat', () => {
  const validSchema: WorkflowSchema = {
    nodes: [
      {
        id: 'start_1',
        type: 'start',
        meta: {
          position: { x: 0, y: 0 },
        },
        data: {
          title: 'Start Node',
        },
      },
      {
        id: 'end_1',
        type: 'end',
        meta: {
          position: { x: 100, y: 100 },
        },
        data: {
          title: 'End Node',
        },
      },
    ],
    edges: [
      {
        sourceNodeID: 'start_1',
        targetNodeID: 'end_1',
      },
    ],
  };

  describe('valid schemas', () => {
    it('should pass validation for a valid basic schema', () => {
      expect(() => schemaFormat(validSchema)).not.toThrow();
    });

    it('should pass validation for schema with optional fields', () => {
      const schemaWithOptionals: WorkflowSchema = {
        nodes: [
          {
            id: 'node_1',
            type: 'custom',
            meta: { position: { x: 0, y: 0 } },
            data: {
              title: 'Custom Node',
              inputs: {
                type: 'object',
                properties: {
                  input1: { type: 'string' },
                },
              },
              outputs: {
                type: 'object',
                properties: {
                  output1: { type: 'string' },
                },
              },
              inputsValues: {
                input1: { value: 'test', type: 'string' },
              },
            },
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(schemaWithOptionals)).not.toThrow();
    });

    it('should pass validation for schema with nested blocks', () => {
      const schemaWithBlocks: WorkflowSchema = {
        nodes: [
          {
            id: 'parent_node',
            type: 'container',
            meta: { position: { x: 0, y: 0 } },
            data: { title: 'Parent Node' },
            blocks: [
              {
                id: 'child_node',
                type: 'child',
                meta: { position: { x: 10, y: 10 } },
                data: { title: 'Child Node' },
              },
            ],
            edges: [],
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(schemaWithBlocks)).not.toThrow();
    });

    it('should pass validation for edges with optional port IDs', () => {
      const schemaWithPorts: WorkflowSchema = {
        nodes: validSchema.nodes,
        edges: [
          {
            sourceNodeID: 'start_1',
            targetNodeID: 'end_1',
            sourcePortID: 'output_port',
            targetPortID: 'input_port',
          },
        ],
      };

      expect(() => schemaFormat(schemaWithPorts)).not.toThrow();
    });
  });

  describe('invalid schemas', () => {
    it('should throw error for null schema', () => {
      expect(() => schemaFormat(null as any)).toThrow('Workflow schema must be a valid object');
    });

    it('should throw error for undefined schema', () => {
      expect(() => schemaFormat(undefined as any)).toThrow(
        'Workflow schema must be a valid object'
      );
    });

    it('should throw error for non-object schema', () => {
      expect(() => schemaFormat('invalid' as any)).toThrow(
        'Workflow schema must be a valid object'
      );
    });

    it('should throw error for missing nodes array', () => {
      const invalidSchema = { edges: [] } as any;
      expect(() => schemaFormat(invalidSchema)).toThrow(
        'Workflow schema must have a valid nodes array'
      );
    });

    it('should throw error for non-array nodes', () => {
      const invalidSchema = { nodes: 'invalid', edges: [] } as any;
      expect(() => schemaFormat(invalidSchema)).toThrow(
        'Workflow schema must have a valid nodes array'
      );
    });

    it('should throw error for missing edges array', () => {
      const invalidSchema = { nodes: [] } as any;
      expect(() => schemaFormat(invalidSchema)).toThrow(
        'Workflow schema must have a valid edges array'
      );
    });

    it('should throw error for non-array edges', () => {
      const invalidSchema = { nodes: [], edges: 'invalid' } as any;
      expect(() => schemaFormat(invalidSchema)).toThrow(
        'Workflow schema must have a valid edges array'
      );
    });
  });

  describe('invalid nodes', () => {
    it('should throw error for node without id', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            type: 'start',
            meta: { position: { x: 0, y: 0 } },
            data: {},
          } as any,
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow('nodes[0].id must be a non-empty string');
    });

    it('should throw error for node with empty id', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: '',
            type: 'start',
            meta: { position: { x: 0, y: 0 } },
            data: {},
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow('nodes[0].id must be a non-empty string');
    });

    it('should throw error for node without type', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'node_1',
            meta: { position: { x: 0, y: 0 } },
            data: {},
          } as any,
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow('nodes[0].type must be a non-empty string');
    });

    it('should throw error for node without meta', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'node_1',
            type: 'start',
            data: {},
          } as any,
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow('nodes[0].meta must be a valid object');
    });

    it('should throw error for node without data', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'node_1',
            type: 'start',
            meta: { position: { x: 0, y: 0 } },
          } as any,
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow('nodes[0].data must be a valid object');
    });

    it('should throw error for invalid blocks field', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'node_1',
            type: 'container',
            meta: { position: { x: 0, y: 0 } },
            data: {},
            blocks: 'invalid' as any,
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'nodes[0].blocks must be an array if present'
      );
    });

    it('should throw error for invalid data.inputs field', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'node_1',
            type: 'start',
            meta: { position: { x: 0, y: 0 } },
            data: {
              inputs: 'invalid',
            } as any,
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'nodes[0].data.inputs must be a valid object if present'
      );
    });
  });

  describe('invalid edges', () => {
    it('should throw error for edge without sourceNodeID', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: validSchema.nodes,
        edges: [
          {
            targetNodeID: 'end_1',
          } as any,
        ],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'edges[0].sourceNodeID must be a non-empty string'
      );
    });

    it('should throw error for edge with empty sourceNodeID', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: validSchema.nodes,
        edges: [
          {
            sourceNodeID: '',
            targetNodeID: 'end_1',
          },
        ],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'edges[0].sourceNodeID must be a non-empty string'
      );
    });

    it('should throw error for edge without targetNodeID', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: validSchema.nodes,
        edges: [
          {
            sourceNodeID: 'start_1',
          } as any,
        ],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'edges[0].targetNodeID must be a non-empty string'
      );
    });

    it('should throw error for invalid sourcePortID type', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: validSchema.nodes,
        edges: [
          {
            sourceNodeID: 'start_1',
            targetNodeID: 'end_1',
            sourcePortID: 123 as any,
          },
        ],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'edges[0].sourcePortID must be a string if present'
      );
    });
  });

  describe('nested validation', () => {
    it('should validate nested blocks recursively', () => {
      const invalidNestedSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'parent_node',
            type: 'container',
            meta: { position: { x: 0, y: 0 } },
            data: { title: 'Parent Node' },
            blocks: [
              {
                id: '', // Invalid empty id in nested block
                type: 'child',
                meta: { position: { x: 10, y: 10 } },
                data: { title: 'Child Node' },
              },
            ],
            edges: [],
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidNestedSchema)).toThrow(
        'nodes[0].id must be a non-empty string'
      );
    });

    it('should throw error for invalid blocks structure', () => {
      const invalidSchema: WorkflowSchema = {
        nodes: [
          {
            id: 'parent_node',
            type: 'container',
            meta: { position: { x: 0, y: 0 } },
            data: { title: 'Parent Node' },
            blocks: 'not an array' as any,
          },
        ],
        edges: [],
      };

      expect(() => schemaFormat(invalidSchema)).toThrow(
        'nodes[0].blocks must be an array if present'
      );
    });
  });
});
