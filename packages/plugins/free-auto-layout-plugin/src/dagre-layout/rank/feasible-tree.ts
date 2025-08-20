/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutEdge } from '../type';
import { LayoutGraph } from '../graph';

/**
 * 计算边的松弛度
 */
const calculateSlack = (graph: LayoutGraph, edge: LayoutEdge): number => {
  const sourceNode = graph.getNode(edge.from);
  const targetNode = graph.getNode(edge.to);
  if (!sourceNode || !targetNode) {
    return Number.POSITIVE_INFINITY;
  }
  return targetNode.rank - sourceNode.rank - (edge.minlen || 1);
};

/**
 * 深度优先搜索构建紧致树
 */
const dfs = (graph: LayoutGraph, tightTree: LayoutGraph, nodeId: string): void => {
  const edges = graph.edges.filter((e) => e.from === nodeId || e.to === nodeId);
  edges.forEach((edge) => {
    const neighborId = edge.from === nodeId ? edge.to : edge.from;
    if (!tightTree.hasNode(neighborId) && calculateSlack(graph, edge) === 0) {
      const neighborNode = graph.getNode(neighborId);
      if (neighborNode) {
        tightTree.addLayoutNode({ ...neighborNode });
        tightTree.addLayoutEdge({ ...edge });
        dfs(graph, tightTree, neighborId);
      }
    }
  });
};

/**
 * 构建最大紧致树
 */
const buildTightTree = (graph: LayoutGraph, tightTree: LayoutGraph): number => {
  tightTree.nodes.forEach((node) => dfs(graph, tightTree, node.id));
  return tightTree.nodes.length;
};

/**
 * 找到具有最小松弛度的边
 */
const findMinSlackEdge = (graph: LayoutGraph, tightTree: LayoutGraph): LayoutEdge | undefined => {
  let minSlack = Number.POSITIVE_INFINITY;
  let minSlackEdge: LayoutEdge | undefined;

  graph.edges.forEach((edge) => {
    const hasSource = tightTree.hasNode(edge.from);
    const hasTarget = tightTree.hasNode(edge.to);
    if (hasSource !== hasTarget) {
      const slack = calculateSlack(graph, edge);
      if (slack < minSlack) {
        minSlack = slack;
        minSlackEdge = edge;
      }
    }
  });

  return minSlackEdge;
};

/**
 * 调整rank值
 */
const shiftRanks = (graph: LayoutGraph, tightTree: LayoutGraph, delta: number): void => {
  tightTree.nodes.forEach((node) => {
    const graphNode = graph.getNode(node.id);
    if (graphNode) {
      graphNode.rank += delta;
    }
  });
};

/**
 * 构建紧致生成树
 */
export const feasibleTree = (graph: LayoutGraph): LayoutGraph => {
  const tightTree = new LayoutGraph();

  // 选择任意节点作为起始节点
  const startNode = graph.nodes[0];
  tightTree.addLayoutNode({ ...startNode });

  while (buildTightTree(graph, tightTree) < graph.nodes.length) {
    const minSlackEdge = findMinSlackEdge(graph, tightTree);
    if (minSlackEdge) {
      const delta = tightTree.hasNode(minSlackEdge.from)
        ? calculateSlack(graph, minSlackEdge)
        : -calculateSlack(graph, minSlackEdge);
      shiftRanks(graph, tightTree, delta);
    }
  }

  return tightTree;
};
