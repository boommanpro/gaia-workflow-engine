/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutGraph } from '../graph';

/**
 * 计算图中节点的最长路径
 */
export const longestPath = (graph: LayoutGraph): LayoutGraph => {
  // 用于记录已访问的节点
  const visited: Record<string, boolean> = {};

  /**
   * 深度优先搜索计算节点的层级
   * @param nodeId 当前节点ID
   * @returns 计算得到的层级
   */
  const dfs = (nodeId: string): number => {
    const node = graph.getNode(nodeId);

    // 如果节点不存在，返回 -1
    if (!node) {
      return -1;
    }

    // 如果节点已访问且已经计算过rank，直接返回其rank
    if (visited[nodeId] && node.rank !== -1) {
      return node.rank;
    }

    // 标记节点为已访问
    visited[nodeId] = true;

    // 获取所有以当前节点为起点的边
    const outgoingEdges = graph.edges.filter((edge) => edge.from === nodeId);

    // 如果没有出边，说明是叶子节点，rank为0
    if (outgoingEdges.length === 0) {
      node.rank = 0;
      return 0;
    }

    // 计算所有子节点的最大rank
    let maxChildRank = -1;
    outgoingEdges.forEach((edge) => {
      const childRank = dfs(edge.to);
      const minlen = edge.minlen || 1; // 使用默认最小长度1，如果未指定
      maxChildRank = Math.max(maxChildRank, childRank + minlen);
    });

    // 当前节点的rank为子节点最大rank + 1
    node.rank = maxChildRank;
    return node.rank;
  };

  // 从每个没有入边的节点（源节点）开始DFS
  const sourceNodes = graph.nodes.filter(
    (node) => !graph.edges.some((edge) => edge.to === node.id)
  );

  sourceNodes.forEach((node) => dfs(node.id));

  // 确保所有节点都被访问到
  graph.nodes.forEach((node) => {
    if (node.rank === -1) {
      dfs(node.id);
    }
  });

  // 反转rank值，使得源节点的rank最小
  const maxRank = Math.max(...graph.nodes.map((node) => node.rank));
  graph.nodes.forEach((node) => {
    node.rank = maxRank - node.rank;
  });

  return graph;
};
