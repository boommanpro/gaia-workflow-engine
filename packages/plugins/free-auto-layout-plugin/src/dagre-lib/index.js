/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

'use strict';

/**
 * Dagre DAG 布局库
 * 开源协议 - MIT
 * 源码 - https://github.com/dagrejs/dagre
 * 论文 - https://graphviz.org/documentation/TSE93.pdf
 */

import acyclic from './acyclic';
import normalize from './normalize';
import rank from './rank';
import { normalizeRanks, removeEmptyRanks } from './util';
import parentDummyChains from './parent-dummy-chains';
import nestingGraph from './nesting-graph';
import addBorderSegments from './add-border-segments';
import coordinateSystem from './coordinate-system';
import order from './order';
import position from './position';
import { util } from './util';

import {
  layout,
  buildLayoutGraph,
  updateInputGraph,
  makeSpaceForEdgeLabels,
  removeSelfEdges,
  injectEdgeLabelProxies,
  assignRankMinMax,
  removeEdgeLabelProxies,
  insertSelfEdges,
  positionSelfEdges,
  removeBorderNodes,
  fixupEdgeLabelCoords,
  translateGraph,
  assignNodeIntersects,
  reversePointsForReversedEdges,
} from './layout';

const dagreLib = {
  layout,
  buildLayoutGraph,
  updateInputGraph,
  makeSpaceForEdgeLabels,
  removeSelfEdges,
  acyclic,
  nestingGraph,
  rank,
  util,
  injectEdgeLabelProxies,
  removeEmptyRanks,
  normalizeRanks,
  assignRankMinMax,
  removeEdgeLabelProxies,
  normalize,
  parentDummyChains,
  addBorderSegments,
  order,
  insertSelfEdges,
  coordinateSystem,
  position,
  positionSelfEdges,
  removeBorderNodes,
  fixupEdgeLabelCoords,
  translateGraph,
  assignNodeIntersects,
  reversePointsForReversedEdges,
};

export { dagreLib };
