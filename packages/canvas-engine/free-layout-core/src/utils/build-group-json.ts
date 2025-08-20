/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeBaseType } from '@flowgram.ai/document';

import { WorkflowJSON, WorkflowNodeJSON } from '../typings';

interface WorkflowGroupJSON extends WorkflowNodeJSON {
  data: {
    parentID?: string;
    blockIDs?: string[];
  };
}

export const buildGroupJSON = (json: WorkflowJSON): WorkflowJSON => {
  const { nodes, edges } = json;
  const groupJSONs = nodes.filter(
    (nodeJSON) => nodeJSON.type === FlowNodeBaseType.GROUP
  ) as WorkflowGroupJSON[];

  const nodeJSONMap = new Map<string, WorkflowNodeJSON>(nodes.map((n) => [n.id, n]));
  const groupNodeJSONs = groupJSONs.map((groupJSON): WorkflowNodeJSON => {
    const groupBlocks = (groupJSON.data.blockIDs ?? [])
      .map((blockID) => nodeJSONMap.get(blockID))
      .filter(Boolean) as WorkflowNodeJSON[];
    const groupEdges = edges?.filter((edge) =>
      groupBlocks.some((block) => block.id === edge.sourceNodeID || block.id === edge.targetNodeID)
    );
    const groupNodeJSON: WorkflowNodeJSON = {
      ...groupJSON,
      blocks: groupBlocks,
      edges: groupEdges,
    };
    return groupNodeJSON;
  });

  const groupBlockSet = new Set(groupJSONs.map((groupJSON) => groupJSON.data.blockIDs).flat());
  const processedNodes = nodes
    .filter((nodeJSON) => !groupBlockSet.has(nodeJSON.id))
    .concat(groupNodeJSONs);
  return {
    nodes: processedNodes,
    edges,
  };
};
