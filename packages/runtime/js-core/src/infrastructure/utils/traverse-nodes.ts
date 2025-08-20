/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { INode } from '@flowgram.ai/runtime-interface';

/**
 * Generic function to traverse a node graph
 * @param startNode The starting node
 * @param getConnectedNodes Function to get connected nodes
 * @returns Array of all traversed nodes
 */
export function traverseNodes(
  startNode: INode,
  getConnectedNodes: (node: INode) => INode[]
): INode[] {
  const visited = new Set<string>();
  const result: INode[] = [];

  const traverse = (node: INode) => {
    for (const connectedNode of getConnectedNodes(node)) {
      if (!visited.has(connectedNode.id)) {
        visited.add(connectedNode.id);
        result.push(connectedNode);
        traverse(connectedNode);
      }
    }
  };

  traverse(startNode);
  return result;
}
