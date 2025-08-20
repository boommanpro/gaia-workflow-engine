/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutGraph } from '../graph';

export const normalizeRanks = (graph: LayoutGraph): LayoutGraph => {
  // 获取所有节点的 rank 值
  const nodeRanks: number[] = graph.nodes.map((node) => {
    const rank: number = node.rank;
    return rank === -1 ? Number.MAX_VALUE : rank;
  });

  // 找出最小的 rank 值
  const minRank: number = Math.min(...nodeRanks);

  // 调整所有节点的 rank 值
  graph.nodes.forEach((node) => {
    if (node.rank !== -1) {
      node.rank -= minRank;
    }
  });

  return graph;
};
