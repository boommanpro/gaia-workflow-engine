/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutConfig, LayoutOptions } from './type';

export const DefaultLayoutConfig: LayoutConfig = {
  rankdir: 'LR',
  align: undefined,
  nodesep: 100,
  edgesep: 10,
  ranksep: 100,
  marginx: 0,
  marginy: 0,
  acyclicer: undefined,
  ranker: 'network-simplex',
};

export const DefaultLayoutOptions: LayoutOptions = {
  filterNode: undefined,
  getFollowNode: undefined,
  disableFitView: false,
  enableAnimation: false,
  animationDuration: 300,
};
