/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutGraph } from './graph';

/**
 * DFS去环算法
 * @param graph 布局图实例
 * @returns 反馈弧集（需要反转的边的ID数组）
 */
const dfsFAS = (graph: LayoutGraph): string[] => {
  const visited: { [key: string]: boolean } = {};
  const stack: { [key: string]: boolean } = {};
  const fas: string[] = [];

  /**
   * DFS遍历
   * @param nodeId 当前节点ID
   */
  const dfs = (nodeId: string): void => {
    visited[nodeId] = true;
    stack[nodeId] = true;

    const outEdges = graph.edges.filter((edge) => edge.from === nodeId);
    outEdges.forEach((edge) => {
      if (!visited[edge.to]) {
        dfs(edge.to);
      } else if (stack[edge.to]) {
        // 发现环，将该边添加到反馈弧集
        fas.push(edge.id);
      }
    });

    stack[nodeId] = false;
  };

  // 对每个未访问的节点进行DFS
  graph.nodes.forEach((node) => {
    if (!visited[node.id]) {
      dfs(node.id);
    }
  });

  return fas;
};

/**
 * 贪心去环算法
 * @param graph 布局图实例
 * @returns 反馈弧集（需要反转的边的ID数组）
 */
const greedyFAS = (graph: LayoutGraph): string[] => {
  const fas: string[] = [];
  const nodeOrder: string[] = [];

  // 计算节点的入度和出度
  const inDegree: { [key: string]: number } = {};
  const outDegree: { [key: string]: number } = {};

  graph.nodes.forEach((node) => {
    inDegree[node.id] = 0;
    outDegree[node.id] = 0;
  });

  graph.edges.forEach((edge) => {
    inDegree[edge.to]++;
    outDegree[edge.from]++;
  });

  // 贪心选择节点
  while (nodeOrder.length < graph.nodes.length) {
    let maxDiff = -Infinity;
    let bestNode: string | null = null;

    graph.nodes.forEach((node) => {
      if (!nodeOrder.includes(node.id)) {
        const diff = outDegree[node.id] - inDegree[node.id];
        if (diff > maxDiff) {
          maxDiff = diff;
          bestNode = node.id;
        }
      }
    });

    if (bestNode) {
      nodeOrder.push(bestNode);
      // 更新相邻节点的入度和出度
      graph.edges.forEach((edge) => {
        if (edge.from === bestNode) {
          inDegree[edge.to]--;
        }
        if (edge.to === bestNode) {
          outDegree[edge.from]--;
        }
      });
    }
  }

  // 根据节点顺序确定需要反转的边
  graph.edges.forEach((edge) => {
    if (nodeOrder.indexOf(edge.from) > nodeOrder.indexOf(edge.to)) {
      fas.push(edge.id);
    }
  });

  return fas;
};

/**
 * 去环
 */
export const acyclic = (graph: LayoutGraph, acyclicer: 'dfs' | 'greedy' = 'dfs'): LayoutGraph => {
  // 使用DFS或贪心算法获取反馈弧集
  const fas = acyclicer === 'dfs' ? dfsFAS(graph) : greedyFAS(graph);

  // 反转反馈弧集中的边
  fas.forEach((edgeId) => {
    const edge = graph.edges.find((e) => e.id === edgeId);
    if (edge) {
      const { from, to } = edge;
      graph.removeEdge(edgeId);
      graph.addLayoutEdge({ id: edgeId, from: to, to: from });
    }
  });

  return graph;
};
