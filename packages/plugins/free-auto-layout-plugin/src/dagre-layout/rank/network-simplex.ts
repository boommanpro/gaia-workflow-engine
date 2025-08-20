/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutEdge, LayoutNode } from '../type';
import { LayoutGraph } from '../graph';
import { longestPath } from './longest-path';
import { feasibleTree } from './feasible-tree';

/**
 * 网络单纯形
 * 参考 https://github.com/dagrejs/dagre/blob/master/lib/rank/network-simplex.js
 */
export const networkSimplex = (g: LayoutGraph): LayoutGraph => {
  longestPath(g); // 初始化层级
  const t = feasibleTree(g); // 构建紧致生成树
  initLowLimValues(t);
  initCutValues(t, g);

  let e: LayoutEdge | undefined;
  while ((e = leaveEdge(t))) {
    const f = enterEdge(t, g, e);
    if (f) {
      exchangeEdges(t, g, e, f);
    }
  }
  return g;
};

const initLowLimValues = (t: LayoutGraph): void => {
  const root = t.nodes[0];
  if (root) {
    dfsAssignLowLim(t, new Map<string, boolean>(), { nextLim: 1 }, root.id);
  }
};

const dfsAssignLowLim = (
  t: LayoutGraph,
  visited: Map<string, boolean>,
  state: { nextLim: number },
  v: string,
  parent?: string
): void => {
  const node = t.getNode(v);
  if (!node) return;

  const low = state.nextLim;
  visited.set(v, true);

  t.edges
    .filter((e) => e.from === v || e.to === v)
    .forEach((e) => {
      const w = e.from === v ? e.to : e.from;
      if (!visited.get(w)) {
        dfsAssignLowLim(t, visited, state, w, v);
      }
    });

  node.low = low;
  node.lim = state.nextLim++;
  if (parent) {
    node.parent = parent;
  } else {
    delete node.parent;
  }
};

const initCutValues = (t: LayoutGraph, g: LayoutGraph): void => {
  const vs = postorder(t);
  vs.slice(0, -1).forEach((v) => assignCutValue(t, g, v));
};

const postorder = (t: LayoutGraph): string[] => {
  const visited = new Set<string>();
  const result: string[] = [];

  const dfs = (nodeId: string): void => {
    const node = t.getNode(nodeId);
    if (!node || visited.has(nodeId)) return;

    visited.add(nodeId);

    t.edges
      .filter((e) => e.from === nodeId || e.to === nodeId)
      .forEach((e) => {
        const neighborId = e.from === nodeId ? e.to : e.from;
        dfs(neighborId);
      });

    result.push(nodeId);
  };

  t.nodes.forEach((node) => dfs(node.id));
  return result;
};

const assignCutValue = (t: LayoutGraph, g: LayoutGraph, childId: string): void => {
  const child = t.getNode(childId);
  if (!child || !child.parent) return;

  const edge = t.edges.find((e) => e.from === childId && e.to === child.parent);
  if (edge) {
    edge.cutvalue = calcCutValue(t, g, childId);
  }
};

const calcCutValue = (t: LayoutGraph, g: LayoutGraph, childId: string): number => {
  const child = t.getNode(childId);
  if (!child || !child.parent) return 0;

  let cutValue = 0;
  const graphEdge = g.edges.find(
    (e) =>
      (e.from === childId && e.to === child.parent) || (e.from === child.parent && e.to === childId)
  );

  if (graphEdge) {
    cutValue = graphEdge.weight || 0;
  }

  g.edges
    .filter((e) => e.from === childId || e.to === childId)
    .forEach((e) => {
      const otherId = e.from === childId ? e.to : e.from;
      if (otherId !== child.parent) {
        const otherWeight = e.weight || 0;
        cutValue += e.from === childId ? otherWeight : -otherWeight;
        if (isTreeEdge(t, childId, otherId)) {
          const treeEdge = t.edges.find(
            (te) =>
              (te.from === childId && te.to === otherId) ||
              (te.from === otherId && te.to === childId)
          );
          if (treeEdge && treeEdge.cutvalue !== undefined) {
            cutValue += e.from === childId ? -treeEdge.cutvalue : treeEdge.cutvalue;
          }
        }
      }
    });

  return cutValue;
};

const isTreeEdge = (t: LayoutGraph, u: string, v: string): boolean =>
  t.edges.some((e) => (e.from === u && e.to === v) || (e.from === v && e.to === u));

const leaveEdge = (t: LayoutGraph): LayoutEdge | undefined =>
  t.edges.find((e) => (e.cutvalue || 0) < 0);

const enterEdge = (t: LayoutGraph, g: LayoutGraph, edge: LayoutEdge): LayoutEdge | undefined => {
  const vLabel = t.getNode(edge.from);
  const wLabel = t.getNode(edge.to);
  if (!vLabel || !wLabel) return undefined;

  const tailLabel = vLabel.lim! > wLabel.lim! ? wLabel : vLabel;
  const flip = tailLabel === wLabel;

  const candidates = g.edges.filter((e) => {
    const vNode = t.getNode(e.from);
    const wNode = t.getNode(e.to);
    return (
      vNode &&
      wNode &&
      flip === isDescendant(t, vNode, tailLabel) &&
      flip !== isDescendant(t, wNode, tailLabel)
    );
  });

  return candidates.reduce((acc, e) => {
    if (slack(g, e) < slack(g, acc)) {
      return e;
    }
    return acc;
  });
};

const isDescendant = (t: LayoutGraph, vLabel: LayoutNode, rootLabel: LayoutNode): boolean =>
  (rootLabel.low || 0) <= (vLabel.lim || 0) && (vLabel.lim || 0) <= (rootLabel.lim || 0);

const slack = (g: LayoutGraph, edge: LayoutEdge): number => {
  const source = g.getNode(edge.from);
  const target = g.getNode(edge.to);
  if (!source || !target) return Number.POSITIVE_INFINITY;
  return Math.abs(target.rank - source.rank) - (edge.minlen || 1);
};

const exchangeEdges = (t: LayoutGraph, g: LayoutGraph, e: LayoutEdge, f: LayoutEdge): void => {
  t.removeEdge(e.id);
  t.addLayoutEdge(f);
  initLowLimValues(t);
  initCutValues(t, g);
  updateRanks(t, g);
};

const updateRanks = (t: LayoutGraph, g: LayoutGraph): void => {
  const root = t.nodes.find((v) => !v.parent);
  if (!root) return;

  const vs = preorder(t, root.id);
  vs.slice(1).forEach((v) => {
    const node = t.getNode(v);
    const parent = t.getNode(node?.parent || '');
    if (!node || !parent) return;

    const edge = g.edges.find(
      (e) => (e.from === v && e.to === node.parent) || (e.from === node.parent && e.to === v)
    );
    if (!edge) return;

    const flipped = edge.from === node.parent;
    node.rank = parent.rank + (flipped ? edge.minlen || 1 : -(edge.minlen || 1));
  });
};

const preorder = (t: LayoutGraph, root: string): string[] => {
  const result: string[] = [];
  const visited = new Set<string>();

  const dfs = (nodeId: string): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    result.push(nodeId);

    t.edges
      .filter((e) => e.from === nodeId || e.to === nodeId)
      .forEach((e) => {
        const neighborId = e.from === nodeId ? e.to : e.from;
        dfs(neighborId);
      });
  };

  dfs(root);
  return result;
};
