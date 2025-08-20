/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { FlowGramNode, CreateNodeParams, INode, IPort } from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeNode } from '@workflow/document/entity';
import { traverseNodes } from './traverse-nodes';

describe('traverseNodes', () => {
  let node: WorkflowRuntimeNode;
  let mockParams: CreateNodeParams;

  beforeEach(() => {
    mockParams = {
      id: 'test-node',
      type: FlowGramNode.Start,
      name: 'Test Node',
      position: { x: 0, y: 0 },
      variable: {},
      data: { testData: 'data' },
    };
    node = new WorkflowRuntimeNode(mockParams);
  });

  describe('basic functionality', () => {
    it('should return empty array when no connected nodes', () => {
      const result = traverseNodes(node, () => []);
      expect(result).toEqual([]);
    });

    it('should return direct connected nodes', () => {
      const connectedNode1 = new WorkflowRuntimeNode({ ...mockParams, id: 'connected-1' });
      const connectedNode2 = new WorkflowRuntimeNode({ ...mockParams, id: 'connected-2' });

      const result = traverseNodes(node, () => [connectedNode1, connectedNode2]);

      expect(result).toHaveLength(2);
      expect(result).toContain(connectedNode1);
      expect(result).toContain(connectedNode2);
    });

    it('should traverse recursively through connected nodes', () => {
      const node1 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-1' });
      const node2 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-2' });
      const node3 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-3' });

      // Setup edges: node -> node1 -> node2 -> node3
      const edge1 = {
        id: 'edge-1',
        from: node,
        to: node1,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge2 = {
        id: 'edge-2',
        from: node1,
        to: node2,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge3 = {
        id: 'edge-3',
        from: node2,
        to: node3,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };

      node.addOutputEdge(edge1);
      node1.addOutputEdge(edge2);
      node2.addOutputEdge(edge3);

      const result = traverseNodes(node, (n) => n.next);

      expect(result).toHaveLength(3);
      expect(result).toContain(node1);
      expect(result).toContain(node2);
      expect(result).toContain(node3);
    });
  });

  describe('circular reference handling', () => {
    it('should handle circular references without infinite loop', () => {
      const node1 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-1' });
      const node2 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-2' });

      // Create a cycle: node -> node1 -> node2 -> node
      const edge1 = {
        id: 'edge-1',
        from: node,
        to: node1,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge2 = {
        id: 'edge-2',
        from: node1,
        to: node2,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge3 = {
        id: 'edge-3',
        from: node2,
        to: node,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };

      node.addOutputEdge(edge1);
      node1.addOutputEdge(edge2);
      node2.addOutputEdge(edge3);

      const result = traverseNodes(node, (n) => n.next);

      // Should visit each node only once, avoiding infinite loop
      expect(result).toHaveLength(3);
      expect(result).toContain(node1);
      expect(result).toContain(node2);
      expect(result).toContain(node); // node will be visited when traversing from node2
    });

    it('should not revisit already visited nodes', () => {
      const node1 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-1' });
      const node2 = new WorkflowRuntimeNode({ ...mockParams, id: 'node-2' });
      const sharedNode = new WorkflowRuntimeNode({ ...mockParams, id: 'shared-node' });

      // Create diamond pattern: node -> [node1, node2] -> sharedNode
      const edge1 = {
        id: 'edge-1',
        from: node,
        to: node1,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge2 = {
        id: 'edge-2',
        from: node,
        to: node2,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge3 = {
        id: 'edge-3',
        from: node1,
        to: sharedNode,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge4 = {
        id: 'edge-4',
        from: node2,
        to: sharedNode,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };

      node.addOutputEdge(edge1);
      node.addOutputEdge(edge2);
      node1.addOutputEdge(edge3);
      node2.addOutputEdge(edge4);

      const result = traverseNodes(node, (n) => n.next);

      // sharedNode should only appear once in the result
      expect(result).toHaveLength(3);
      expect(result).toContain(node1);
      expect(result).toContain(node2);
      expect(result).toContain(sharedNode);

      // Verify sharedNode appears only once
      const sharedNodeCount = result.filter((n) => n.id === 'shared-node').length;
      expect(sharedNodeCount).toBe(1);
    });
  });

  describe('different connection types', () => {
    it('should work with predecessor connections', () => {
      const predecessor1 = new WorkflowRuntimeNode({ ...mockParams, id: 'pred-1' });
      const predecessor2 = new WorkflowRuntimeNode({ ...mockParams, id: 'pred-2' });

      const edge1 = {
        id: 'edge-1',
        from: predecessor1,
        to: node,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };
      const edge2 = {
        id: 'edge-2',
        from: predecessor2,
        to: node,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };

      node.addInputEdge(edge1);
      node.addInputEdge(edge2);

      const result = traverseNodes(node, (n) => n.prev);

      expect(result).toHaveLength(2);
      expect(result).toContain(predecessor1);
      expect(result).toContain(predecessor2);
    });

    it('should work with custom connection function', () => {
      const customNode1 = new WorkflowRuntimeNode({ ...mockParams, id: 'custom-1' });
      const customNode2 = new WorkflowRuntimeNode({ ...mockParams, id: 'custom-2' });

      // Custom function that returns specific nodes
      const customConnector = (n: INode) => {
        if (n.id === 'test-node') {
          return [customNode1];
        }
        if (n.id === 'custom-1') {
          return [customNode2];
        }
        return [];
      };

      const result = traverseNodes(node, customConnector);

      expect(result).toHaveLength(2);
      expect(result).toContain(customNode1);
      expect(result).toContain(customNode2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty connections gracefully', () => {
      const result = traverseNodes(node, () => []);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined connections gracefully', () => {
      const result = traverseNodes(node, () => []);
      expect(result).toEqual([]);
    });

    it('should handle single node with self-reference', () => {
      const edge = {
        id: 'self-edge',
        from: node,
        to: node,
        fromPort: {} as IPort,
        toPort: {} as IPort,
      };

      node.addOutputEdge(edge);

      const result = traverseNodes(node, (n) => n.next);

      // Should include the node itself when it's connected to itself
      expect(result).toHaveLength(1);
      expect(result).toContain(node);
    });
  });
});
