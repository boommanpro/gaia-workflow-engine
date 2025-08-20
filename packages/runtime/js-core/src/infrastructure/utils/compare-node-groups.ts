/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { INode } from '@flowgram.ai/runtime-interface';

/**
 * Interface for node comparison results
 */
export interface NodeComparisonResult {
  /** Nodes common to both groups A and B */
  common: INode[];
  /** Nodes unique to group A */
  uniqueToA: INode[];
  /** Nodes unique to group B */
  uniqueToB: INode[];
}

/**
 * Compare two groups of node arrays to find common nodes and nodes unique to each group
 *
 * @param groupA Array of nodes in group A
 * @param groupB Array of nodes in group B
 * @returns Node comparison result
 *
 * @example
 * ```typescript
 * const groupA = [
 *   [node1, node4, node5, node6, node10],
 *   [node2, node3, node4, node5, node6, node10]
 * ];
 * const groupB = [
 *   [node7, node8, node9, node4, node5, node6, node10]
 * ];
 *
 * const result = compareNodeGroups(groupA, groupB);
 * -> result.common: [node4, node5, node6, node10]
 * -> result.uniqueToA: [node1, node2, node3]
 * -> result.uniqueToB: [node7, node8, node9]
 * ```
 */
export function compareNodeGroups(groupA: INode[][], groupB: INode[][]): NodeComparisonResult {
  // Flatten and deduplicate all nodes in group A
  const flatA = groupA.flat();
  const setA = new Map<string, INode>();
  flatA.forEach((node) => {
    setA.set(node.id, node);
  });

  // Flatten and deduplicate all nodes in group B
  const flatB = groupB.flat();
  const setB = new Map<string, INode>();
  flatB.forEach((node) => {
    setB.set(node.id, node);
  });

  // Find common nodes
  const common: INode[] = [];
  const uniqueToA: INode[] = [];
  const uniqueToB: INode[] = [];

  // Iterate through group A nodes to find common nodes and nodes unique to A
  setA.forEach((node, id) => {
    if (setB.has(id)) {
      common.push(node);
    } else {
      uniqueToA.push(node);
    }
  });

  // Iterate through group B nodes to find nodes unique to B
  setB.forEach((node, id) => {
    if (!setA.has(id)) {
      uniqueToB.push(node);
    }
  });

  return {
    common,
    uniqueToA,
    uniqueToB,
  };
}
