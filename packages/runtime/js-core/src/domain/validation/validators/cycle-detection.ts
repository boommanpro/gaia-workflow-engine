/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const cycleDetection = (schema: WorkflowSchema) => {
  const { nodes, edges } = schema;

  // Build adjacency list for the graph
  const adjacencyList = new Map<string, string[]>();
  const nodeIds = new Set(nodes.map((node) => node.id));

  // Initialize adjacency list
  nodeIds.forEach((nodeId) => {
    adjacencyList.set(nodeId, []);
  });

  // Populate adjacency list with edges
  edges.forEach((edge) => {
    const sourceList = adjacencyList.get(edge.sourceNodeID);
    if (sourceList) {
      sourceList.push(edge.targetNodeID);
    }
  });

  enum NodeStatus {
    Unvisited,
    Visiting,
    Visited,
  }

  const nodeStatusMap = new Map<string, NodeStatus>();

  // Initialize all nodes as WHITE
  nodeIds.forEach((nodeId) => {
    nodeStatusMap.set(nodeId, NodeStatus.Unvisited);
  });

  const detectCycleFromNode = (nodeId: string): boolean => {
    nodeStatusMap.set(nodeId, NodeStatus.Visiting);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const neighborColor = nodeStatusMap.get(neighbor);

      if (neighborColor === NodeStatus.Visiting) {
        // Back edge found - cycle detected
        return true;
      }

      if (neighborColor === NodeStatus.Unvisited && detectCycleFromNode(neighbor)) {
        return true;
      }
    }

    nodeStatusMap.set(nodeId, NodeStatus.Visited);
    return false;
  };

  // Check for cycles starting from each unvisited node
  for (const nodeId of nodeIds) {
    if (nodeStatusMap.get(nodeId) === NodeStatus.Unvisited) {
      if (detectCycleFromNode(nodeId)) {
        throw new Error('Workflow schema contains a cycle, which is not allowed');
      }
    }
  }

  // Recursively check cycles in nested blocks
  nodes.forEach((node) => {
    if (node.blocks) {
      cycleDetection({
        nodes: node.blocks,
        edges: node.edges ?? [],
      });
    }
  });
};
