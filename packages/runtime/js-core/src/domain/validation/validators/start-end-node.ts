/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema, FlowGramNode } from '@flowgram.ai/runtime-interface';

const blockStartEndNode = (schema: WorkflowSchema) => {
  // Optimize performance by using single traversal instead of two separate filter operations
  const { blockStartNodes, blockEndNodes } = schema.nodes.reduce(
    (acc, node) => {
      if (node.type === FlowGramNode.BlockStart) {
        acc.blockStartNodes.push(node);
      } else if (node.type === FlowGramNode.BlockEnd) {
        acc.blockEndNodes.push(node);
      }
      return acc;
    },
    { blockStartNodes: [] as typeof schema.nodes, blockEndNodes: [] as typeof schema.nodes }
  );
  if (!blockStartNodes.length && !blockEndNodes.length) {
    throw new Error('Workflow block schema must have a block-start node and a block-end node');
  }
  if (!blockStartNodes.length) {
    throw new Error('Workflow block schema must have a block-start node');
  }
  if (!blockEndNodes.length) {
    throw new Error('Workflow block schema must have an block-end node');
  }
  if (blockStartNodes.length > 1) {
    throw new Error('Workflow block schema must have only one block-start node');
  }
  if (blockEndNodes.length > 1) {
    throw new Error('Workflow block schema must have only one block-end node');
  }
  schema.nodes.forEach((node) => {
    if (node.blocks) {
      blockStartEndNode({
        nodes: node.blocks,
        edges: node.edges ?? [],
      });
    }
  });
};

export const startEndNode = (schema: WorkflowSchema) => {
  // Optimize performance by using single traversal instead of two separate filter operations
  const { startNodes, endNodes } = schema.nodes.reduce(
    (acc, node) => {
      if (node.type === FlowGramNode.Start) {
        acc.startNodes.push(node);
      } else if (node.type === FlowGramNode.End) {
        acc.endNodes.push(node);
      }
      return acc;
    },
    { startNodes: [] as typeof schema.nodes, endNodes: [] as typeof schema.nodes }
  );
  if (!startNodes.length && !endNodes.length) {
    throw new Error('Workflow schema must have a start node and an end node');
  }
  if (!startNodes.length) {
    throw new Error('Workflow schema must have a start node');
  }
  if (!endNodes.length) {
    throw new Error('Workflow schema must have an end node');
  }
  if (startNodes.length > 1) {
    throw new Error('Workflow schema must have only one start node');
  }
  if (endNodes.length > 1) {
    throw new Error('Workflow schema must have only one end node');
  }
  schema.nodes.forEach((node) => {
    if (node.blocks) {
      blockStartEndNode({
        nodes: node.blocks,
        edges: node.edges ?? [],
      });
    }
  });
};
