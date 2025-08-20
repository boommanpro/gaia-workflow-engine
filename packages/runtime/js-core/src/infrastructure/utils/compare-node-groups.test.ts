/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { INode } from '@flowgram.ai/runtime-interface';

import { compareNodeGroups } from './compare-node-groups';

// Helper function to create mock nodes
function createMockNode(id: string): INode {
  return {
    id,
    type: 'basic' as any,
    name: `Node ${id}`,
    position: { x: 0, y: 0 },
    declare: {},
    data: {},
    ports: { inputs: [], outputs: [] },
    edges: { inputs: [], outputs: [] },
    parent: null,
    children: [],
    prev: [],
    next: [],
    successors: [],
    predecessors: [],
    isBranch: false,
  };
}

describe('compareNodeGroups', () => {
  it('should correctly identify common, unique to A, and unique to B nodes', () => {
    // Create test nodes
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');
    const nodeC = createMockNode('C');
    const nodeD = createMockNode('D');
    const nodeE = createMockNode('E');
    const nodeF = createMockNode('F');
    const nodeG = createMockNode('G');
    const nodeH = createMockNode('H');
    const nodeI = createMockNode('I');
    const nodeJ = createMockNode('J');

    // Set up groups according to user example
    const groupA = [
      [nodeA, nodeD, nodeE, nodeF, nodeJ],
      [nodeB, nodeC, nodeD, nodeE, nodeF, nodeJ],
    ];
    const groupB = [[nodeG, nodeH, nodeI, nodeD, nodeE, nodeF, nodeJ]];

    const result = compareNodeGroups(groupA, groupB);

    // Verify common nodes: D,E,F,J
    expect(result.common).toHaveLength(4);
    expect(result.common.map((n) => n.id)).toEqual(expect.arrayContaining(['D', 'E', 'F', 'J']));

    // Verify nodes unique to group A: A,B,C
    expect(result.uniqueToA).toHaveLength(3);
    expect(result.uniqueToA.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'C']));

    // Verify nodes unique to group B: G,H,I
    expect(result.uniqueToB).toHaveLength(3);
    expect(result.uniqueToB.map((n) => n.id)).toEqual(expect.arrayContaining(['G', 'H', 'I']));
  });

  it('should handle empty groups', () => {
    const result = compareNodeGroups([], []);

    expect(result.common).toHaveLength(0);
    expect(result.uniqueToA).toHaveLength(0);
    expect(result.uniqueToB).toHaveLength(0);
  });

  it('should handle one empty group', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');

    const groupA = [[nodeA, nodeB]];
    const groupB: INode[][] = [];

    const result = compareNodeGroups(groupA, groupB);

    expect(result.common).toHaveLength(0);
    expect(result.uniqueToA).toHaveLength(2);
    expect(result.uniqueToA.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'B']));
    expect(result.uniqueToB).toHaveLength(0);
  });

  it('should handle duplicate nodes within the same group', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');

    const groupA = [
      [nodeA, nodeA, nodeB], // nodeA duplicated
      [nodeA, nodeB], // nodeA and nodeB duplicated
    ];
    const groupB = [[nodeA]];

    const result = compareNodeGroups(groupA, groupB);

    // Should deduplicate, nodeA is common, nodeB is unique to A
    expect(result.common).toHaveLength(1);
    expect(result.common[0].id).toBe('A');
    expect(result.uniqueToA).toHaveLength(1);
    expect(result.uniqueToA[0].id).toBe('B');
    expect(result.uniqueToB).toHaveLength(0);
  });

  it('should handle all nodes being common', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');
    const nodeC = createMockNode('C');

    const groupA = [[nodeA, nodeB, nodeC]];
    const groupB = [[nodeA, nodeB, nodeC]];

    const result = compareNodeGroups(groupA, groupB);

    expect(result.common).toHaveLength(3);
    expect(result.common.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(result.uniqueToA).toHaveLength(0);
    expect(result.uniqueToB).toHaveLength(0);
  });

  it('should handle no common nodes', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');
    const nodeC = createMockNode('C');
    const nodeD = createMockNode('D');

    const groupA = [[nodeA, nodeB]];
    const groupB = [[nodeC, nodeD]];

    const result = compareNodeGroups(groupA, groupB);

    expect(result.common).toHaveLength(0);
    expect(result.uniqueToA).toHaveLength(2);
    expect(result.uniqueToA.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'B']));
    expect(result.uniqueToB).toHaveLength(2);
    expect(result.uniqueToB.map((n) => n.id)).toEqual(expect.arrayContaining(['C', 'D']));
  });

  it('should handle single node in each group', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');

    const groupA = [[nodeA]];
    const groupB = [[nodeB]];

    const result = compareNodeGroups(groupA, groupB);

    expect(result.common).toHaveLength(0);
    expect(result.uniqueToA).toHaveLength(1);
    expect(result.uniqueToA[0].id).toBe('A');
    expect(result.uniqueToB).toHaveLength(1);
    expect(result.uniqueToB[0].id).toBe('B');
  });

  it('should handle multiple sub-arrays with mixed scenarios', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');
    const nodeC = createMockNode('C');
    const nodeD = createMockNode('D');
    const nodeE = createMockNode('E');

    const groupA = [
      [nodeA, nodeB],
      [nodeC, nodeD],
    ];
    const groupB = [[nodeB, nodeC], [nodeE]];

    const result = compareNodeGroups(groupA, groupB);

    expect(result.common).toHaveLength(2);
    expect(result.common.map((n) => n.id)).toEqual(expect.arrayContaining(['B', 'C']));
    expect(result.uniqueToA).toHaveLength(2);
    expect(result.uniqueToA.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'D']));
    expect(result.uniqueToB).toHaveLength(1);
    expect(result.uniqueToB[0].id).toBe('E');
  });

  it('should preserve node object references in results', () => {
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');

    const groupA = [[nodeA]];
    const groupB = [[nodeA, nodeB]];

    const result = compareNodeGroups(groupA, groupB);

    // Verify that original node object references are returned
    expect(result.common[0]).toBe(nodeA);
    expect(result.uniqueToB[0]).toBe(nodeB);
  });

  it('should handle large number of nodes efficiently', () => {
    // Create large number of nodes to test performance
    const nodes = Array.from({ length: 100 }, (_, i) => createMockNode(`node${i}`));

    const groupA = [nodes.slice(0, 60)];
    const groupB = [nodes.slice(40, 100)];

    const result = compareNodeGroups(groupA, groupB);

    // Verify result correctness
    expect(result.common).toHaveLength(20); // nodes 40-59 (20 nodes)
    expect(result.uniqueToA).toHaveLength(40); // nodes 0-39 (40 nodes)
    expect(result.uniqueToB).toHaveLength(40); // nodes 60-99 (40 nodes)
  });

  it('should handle edge case with same node instance in both groups', () => {
    const sharedNode = createMockNode('shared');
    const nodeA = createMockNode('A');
    const nodeB = createMockNode('B');

    const groupA = [[sharedNode, nodeA]];
    const groupB = [[sharedNode, nodeB]];

    const result = compareNodeGroups(groupA, groupB);

    expect(result.common).toHaveLength(1);
    expect(result.common[0]).toBe(sharedNode);
    expect(result.uniqueToA).toHaveLength(1);
    expect(result.uniqueToA[0]).toBe(nodeA);
    expect(result.uniqueToB).toHaveLength(1);
    expect(result.uniqueToB[0]).toBe(nodeB);
  });

  it('should handle complex nested scenarios', () => {
    const nodes = Array.from({ length: 10 }, (_, i) => createMockNode(String.fromCharCode(65 + i))); // A-J

    const groupA = [
      [nodes[0], nodes[1], nodes[2]], // A,B,C
      [nodes[3], nodes[4]], // D,E
      [nodes[5], nodes[6], nodes[7]], // F,G,H
    ];
    const groupB = [
      [nodes[2], nodes[3], nodes[4]], // C,D,E
      [nodes[7], nodes[8], nodes[9]], // H,I,J
    ];

    const result = compareNodeGroups(groupA, groupB);

    // Common nodes: C,D,E,H
    expect(result.common).toHaveLength(4);
    expect(result.common.map((n) => n.id)).toEqual(expect.arrayContaining(['C', 'D', 'E', 'H']));

    // Unique to group A: A,B,F,G
    expect(result.uniqueToA).toHaveLength(4);
    expect(result.uniqueToA.map((n) => n.id)).toEqual(expect.arrayContaining(['A', 'B', 'F', 'G']));

    // Unique to group B: I,J
    expect(result.uniqueToB).toHaveLength(2);
    expect(result.uniqueToB.map((n) => n.id)).toEqual(expect.arrayContaining(['I', 'J']));
  });
});
