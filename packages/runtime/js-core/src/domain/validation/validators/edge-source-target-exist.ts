/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const edgeSourceTargetExist = (schema: WorkflowSchema) => {
  const { nodes, edges } = schema;
  const nodeSet = new Set(nodes.map((node) => node.id));
  edges.forEach((edge) => {
    if (!nodeSet.has(edge.sourceNodeID)) {
      throw new Error(`Workflow schema edge source node "${edge.sourceNodeID}" not exist`);
    }
    if (!nodeSet.has(edge.targetNodeID)) {
      throw new Error(`Workflow schema edge target node "${edge.targetNodeID}" not exist`);
    }
  });
  nodes.forEach((node) => {
    if (node.blocks) {
      edgeSourceTargetExist({
        nodes: node.blocks,
        edges: node.edges ?? [],
      });
    }
  });
};
