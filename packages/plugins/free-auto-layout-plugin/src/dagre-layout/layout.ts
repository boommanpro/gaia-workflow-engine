/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  WorkflowLineEntity,
  WorkflowNodeEntity,
  WorkflowNodeLinesData,
} from '@flowgram.ai/free-layout-core';
import { TransformData } from '@flowgram.ai/core';

import { LayoutNode } from './type';
import { LayoutGraph } from './graph';
import { acyclic, feasibleTree, longestPath, networkSimplex, normalizeRanks, order } from './';

/**
 * 布局算法
 * 参考 dagre.js 的实现 https://github.com/dagrejs/dagre
 */
export namespace DagreLayout {
  const getNextEdges = (node: WorkflowNodeEntity): WorkflowLineEntity[] => {
    const linesData = node.getData<WorkflowNodeLinesData>(WorkflowNodeLinesData);
    return linesData.outputLines.filter((line) => line.from && line.to);
  };

  const getPrevEdges = (node: WorkflowNodeEntity): WorkflowLineEntity[] => {
    const linesData = node.getData<WorkflowNodeLinesData>(WorkflowNodeLinesData);
    return linesData.inputLines.filter((line) => line.from && line.to);
  };

  /** 添加节点 */
  const createData = (params: {
    node: WorkflowNodeEntity;
    depth: number;
    graph: LayoutGraph;
  }): LayoutGraph => {
    const { node, depth, graph } = params;
    if (graph.hasNode(node.id)) {
      return graph;
    }
    graph.addNode(node);
    const prevEdges = getPrevEdges(node);
    const nextEdges = getNextEdges(node);
    prevEdges.forEach((prevEdge) => {
      graph.addEdge(prevEdge);
      createData({ node: prevEdge.from, depth: depth - 1, graph });
    });
    nextEdges.forEach((nextEdge) => {
      graph.addEdge(nextEdge);
      createData({ node: nextEdge.to!, depth: depth + 1, graph });
    });
    return graph;
  };

  // 定义一些常量
  const NODE_SPACING = 100; // 同层级节点之间的垂直间距
  const RANK_SPACING = 100; // 层级之间的水平间距

  /** 计算图中所有节点的坐标 */
  const calcCoordinates = (graph: LayoutGraph): LayoutGraph => {
    // 按rank对节点进行分组
    const rankGroups = groupNodesByRank(graph.nodes);

    // 计算每个rank的最大高度
    const rankHeights = calculateRankHeights(rankGroups);

    // 计算每个节点的坐标
    let currentX = 0;
    rankGroups.forEach((nodesInRank, rank) => {
      const rankHeight = rankHeights[rank];

      nodesInRank.forEach((node) => {
        // 计算X坐标
        node.position.x = currentX + node.size.width / 2;

        // 计算Y坐标
        const totalHeightOfRank = nodesInRank.reduce((sum, n) => sum + n.size.height, 0);
        const totalSpacing = (nodesInRank.length - 1) * NODE_SPACING;
        const startY = (rankHeight - totalHeightOfRank - totalSpacing) / 2;

        let currentY = startY;
        for (let i = 0; i < node.order; i++) {
          currentY += nodesInRank[i].size.height + NODE_SPACING;
        }
        node.position.y = currentY + node.size.height / 2;
      });

      // 更新X坐标为下一个rank的起始位置
      currentX += rankHeight + RANK_SPACING;
    });
    return graph;
  };

  /** 按rank对节点进行分组 */
  const groupNodesByRank = (nodes: LayoutNode[]): LayoutNode[][] => {
    const groups: LayoutNode[][] = [];
    nodes.forEach((node) => {
      if (!groups[node.rank]) {
        groups[node.rank] = [];
      }
      groups[node.rank].push(node);
    });
    return groups;
  };

  /** 计算每个rank的最大高度 */
  const calculateRankHeights = (rankGroups: LayoutNode[][]): number[] =>
    rankGroups.map((nodesInRank) => Math.max(...nodesInRank.map((node) => node.size.width)));

  const positioning = (graph: LayoutGraph): LayoutGraph => {
    graph.nodes.forEach((node) => {
      const transform = node.node.getData(TransformData);
      transform.update({
        position: node.position,
      });
    });
    return graph;
  };

  const rank = (
    graph: LayoutGraph,
    ranker: 'longest-path' | 'network-simplex' | 'tight-tree' = 'network-simplex'
  ): LayoutGraph => {
    if (ranker === 'longest-path') {
      longestPath(graph);
    } else if (ranker === 'network-simplex') {
      networkSimplex(graph);
    } else if (ranker === 'tight-tree') {
      feasibleTree(graph);
    }
    return graph;
  };

  export const applyLayout = (graph: LayoutGraph): void => {
    acyclic(graph); // 去环
    rank(graph); // 分层
    normalizeRanks(graph); // 归一化 rank 值
    order(graph); // 重心法对同层级节点进行排序
    calcCoordinates(graph); // 分配坐标
    positioning(graph); // 应用布局
  };

  /** 创建布局图 */
  export const createGraph = (node: WorkflowNodeEntity): LayoutGraph => {
    const graph = new LayoutGraph();
    createData({ node, depth: 0, graph });
    applyLayout(graph);
    return graph;
  };
}
