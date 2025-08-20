/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutGraph } from './graph';

// 辅助函数：获取图中的最大rank
const getMaxRank = (graph: LayoutGraph): number =>
  Math.max(...graph.nodes.map((node) => node.rank));

// 辅助函数：根据rank构建层级图
const buildLayerGraph = (
  graph: LayoutGraph,
  rank: number,
  edgeType: 'inEdges' | 'outEdges'
): LayoutGraph => {
  const layerGraph = new LayoutGraph();

  graph.nodes
    .filter((node) => node.rank === rank)
    .forEach((node) => {
      layerGraph.addLayoutNode(node);
    });

  graph.edges.forEach((edge) => {
    const sourceNode = graph.getNode(edge.from);
    const targetNode = graph.getNode(edge.to);
    if (!sourceNode || !targetNode) return;

    if (edgeType === 'inEdges' && targetNode.rank === rank) {
      layerGraph.addLayoutEdge(edge);
    } else if (edgeType === 'outEdges' && sourceNode.rank === rank) {
      layerGraph.addLayoutEdge(edge);
    }
  });

  return layerGraph;
};

// 辅助函数：初始化order
const initOrder = (graph: LayoutGraph): { [key: number]: string[] } => {
  const layering: { [key: number]: string[] } = {};
  graph.nodes.forEach((node) => {
    if (!layering[node.rank]) {
      layering[node.rank] = [];
    }
    layering[node.rank].push(node.id);
  });
  return layering;
};

// 辅助函数：分配order
const assignOrder = (graph: LayoutGraph, layering: { [key: number]: string[] }): void => {
  Object.entries(layering).forEach(([rank, layer]) => {
    layer.forEach((nodeId, index) => {
      const node = graph.getNode(nodeId);
      if (node) {
        node.order = index;
      }
    });
  });
};

// 辅助函数：计算交叉数
const crossCount = (graph: LayoutGraph, layering: { [key: number]: string[] }): number => {
  let cc = 0;
  const layers = Object.values(layering);

  for (let i = 1; i < layers.length; i++) {
    const northLayer = layers[i - 1];
    const southLayer = layers[i];

    for (let j = 0; j < northLayer.length; j++) {
      for (let k = j + 1; k < northLayer.length; k++) {
        const v = graph.getNode(northLayer[j]);
        const w = graph.getNode(northLayer[k]);
        if (!v || !w) continue;

        // 获取v和w的南向邻居
        const vNeighbors = graph.edges
          .filter((e) => e.from === v.id)
          .map((e) => graph.getNode(e.to));
        const wNeighbors = graph.edges
          .filter((e) => e.from === w.id)
          .map((e) => graph.getNode(e.to));

        for (const vNeighbor of vNeighbors) {
          for (const wNeighbor of wNeighbors) {
            if (!vNeighbor || !wNeighbor) continue;
            if (southLayer.indexOf(vNeighbor.id) > southLayer.indexOf(wNeighbor.id)) {
              cc++;
            }
          }
        }
      }
    }
  }

  return cc;
};

// 辅助函数：构建复合图
const buildCompoundGraph = (): LayoutGraph => new LayoutGraph();

// 辅助函数：添加子图约束
const addSubgraphConstraints = (layerGraph: LayoutGraph, cg: LayoutGraph, vs: string[]): void => {
  const prev: { [key: string]: string } = {};
  let root = layerGraph.nodes[0]?.id;
  vs.forEach((v) => {
    let prevV = prev[root];
    if (prevV) {
      cg.addLayoutEdge({ id: `${prevV}-${v}`, from: prevV, to: v, weight: 0 });
    }
    prev[root] = v;
  });
};

// 辅助函数：对子图进行排序
const sortSubgraph = (
  layerGraph: LayoutGraph,
  root: string,
  cg: LayoutGraph,
  biasRight: boolean
): { vs: string[] } => {
  const vs: string[] = [];
  const visited = new Set<string>();
  const nodeData = new Map<string, { barycenter: number; weight: number }>();

  const dfs = (v: string) => {
    if (visited.has(v)) return;
    visited.add(v);

    let barycenter = 0;
    let weight = 0;

    const node = layerGraph.getNode(v);
    if (node) {
      const edges = biasRight
        ? layerGraph.edges.filter((e) => e.to === v)
        : layerGraph.edges.filter((e) => e.from === v);

      edges.forEach((edge) => {
        const w = biasRight ? edge.from : edge.to;
        const otherNode = layerGraph.getNode(w);
        if (otherNode) {
          const edgeWeight = edge.weight || 1;
          weight += edgeWeight;
          barycenter += (otherNode.order || 0) * edgeWeight;
        }
      });

      if (weight > 0) {
        barycenter /= weight;
      }
    }

    nodeData.set(v, { barycenter, weight });
    vs.push(v);

    const neighbors = layerGraph.edges
      .filter((e) => e.from === v || e.to === v)
      .map((e) => (e.from === v ? e.to : e.from));
    neighbors.sort((a, b) => {
      const nodeA = layerGraph.getNode(a);
      const nodeB = layerGraph.getNode(b);
      return (nodeA?.order || 0) - (nodeB?.order || 0);
    });
    neighbors.forEach(dfs);
  };

  dfs(root);

  // 根据重心值和权重排序
  vs.sort((a, b) => {
    const aData = nodeData.get(a);
    const bData = nodeData.get(b);
    if (aData && bData) {
      if (Math.abs(aData.barycenter - bData.barycenter) < 0.001) {
        return bData.weight - aData.weight;
      }
      return aData.barycenter - bData.barycenter;
    }
    return 0;
  });

  return { vs };
};

// 新增：局部搜索优化
const localSearch = (graph: LayoutGraph, layering: { [key: number]: string[] }): void => {
  const ranks = Object.keys(layering).map(Number);
  ranks.forEach((rank) => {
    const layer = layering[rank];
    for (let i = 0; i < layer.length - 1; i++) {
      for (let j = i + 1; j < layer.length; j++) {
        const currentCC = crossCount(graph, layering);
        // 交换两个节点的位置
        [layer[i], layer[j]] = [layer[j], layer[i]];
        const newCC = crossCount(graph, layering);
        // 如果交叉数增加，则恢复交换
        if (newCC > currentCC) {
          [layer[i], layer[j]] = [layer[j], layer[i]];
        }
      }
    }
  });
};

// 优化：sweepLayerGraphs 函数
const sweepLayerGraphs = (layerGraphs: LayoutGraph[], biasRight: boolean): void => {
  const cg = buildCompoundGraph();
  layerGraphs.forEach((lg) => {
    const root = lg.nodes[0]?.id;
    if (root) {
      const sorted = sortSubgraph(lg, root, cg, biasRight);
      sorted.vs.forEach((v, i) => {
        const node = lg.getNode(v);
        if (node) {
          node.order = i;
        }
      });
      addSubgraphConstraints(lg, cg, sorted.vs);
    }
  });
};

// 更新主函数 order
export const order = (graph: LayoutGraph): LayoutGraph => {
  const maxRank = getMaxRank(graph);
  const downLayerGraphs = Array.from({ length: maxRank + 1 }, (_, i) =>
    buildLayerGraph(graph, i, 'inEdges')
  );
  const upLayerGraphs = Array.from({ length: maxRank + 1 }, (_, i) =>
    buildLayerGraph(graph, maxRank - i, 'outEdges')
  );

  let layering = initOrder(graph);
  assignOrder(graph, layering);

  let bestCC = Number.POSITIVE_INFINITY;
  let bestLayering = layering;

  // 增加迭代次数
  for (let i = 0, lastBest = 0; lastBest < 8; ++i, ++lastBest) {
    sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);

    layering = initOrder(graph);
    localSearch(graph, layering); // 应用局部搜索
    const cc = crossCount(graph, layering);
    if (cc < bestCC) {
      lastBest = 0;
      bestLayering = JSON.parse(JSON.stringify(layering));
      bestCC = cc;
    }
  }

  assignOrder(graph, bestLayering);

  return graph;
};
