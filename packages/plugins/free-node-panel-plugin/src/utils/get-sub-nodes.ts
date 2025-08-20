/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeEntity, WorkflowLinesManager } from '@flowgram.ai/free-layout-core';

import { isContainer } from './is-container';

export type IGetSubsequentNodes = (params: {
  node: WorkflowNodeEntity;
  linesManager: WorkflowLinesManager;
}) => WorkflowNodeEntity[];

/** 获取后续节点 */
export const getSubsequentNodes: IGetSubsequentNodes = (params) => {
  const { node, linesManager } = params;
  if (isContainer(node)) {
    return [];
  }
  const brothers = node.parent?.blocks ?? [];
  const linkedBrothers = new Set();
  const linesMap = new Map<string, string[]>();
  linesManager.getAllLines().forEach((line) => {
    if (!linesMap.has(line.from.id)) {
      linesMap.set(line.from.id, []);
    }
    if (
      !line.to?.id ||
      isContainer(line.to) // 子画布内部成环
    ) {
      return;
    }
    linesMap.get(line.from.id)?.push(line.to.id);
  });

  const bfs = (nodeId: string) => {
    if (linkedBrothers.has(nodeId)) {
      return;
    }
    linkedBrothers.add(nodeId);
    const nextNodes = linesMap.get(nodeId) ?? [];
    nextNodes.forEach(bfs);
  };

  bfs(node.id);

  const subsequentNodes = brothers.filter((node) => linkedBrothers.has(node.id));
  return subsequentNodes;
};
