/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowSnapLayerOptions, WorkflowSnapServiceOptions } from './type';

export const SnapDefaultOptions: WorkflowSnapServiceOptions & WorkflowSnapLayerOptions = {
  enableEdgeSnapping: true,
  edgeThreshold: 7,
  enableGridSnapping: false,
  gridSize: 20,
  enableMultiSnapping: true,
  enableOnlyViewportSnapping: true,
  edgeColor: '#4E40E5',
  alignColor: '#4E40E5',
  edgeLineWidth: 2,
  alignLineWidth: 2,
  alignCrossWidth: 16,
};

export const Epsilon = 0.00001;
