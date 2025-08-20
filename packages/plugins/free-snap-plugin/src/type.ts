/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import type { Rectangle } from '@flowgram.ai/utils';

export interface SnapNodeRect {
  id: string;
  rect: Rectangle;
  entity: WorkflowNodeEntity;
}

export interface SnapLine {
  x?: number;
  y?: number;
  sourceNodeId: string;
}

export interface SnapHorizontalLine extends SnapLine {
  y: number;
}

export interface SnapVerticalLine extends SnapLine {
  x: number;
}

export interface SnapMidHorizontalLine extends SnapLine {
  y: number;
}

export interface SnapMidVerticalLine extends SnapLine {
  x: number;
}

export interface SnapLines {
  horizontal: SnapHorizontalLine[];
  vertical: SnapVerticalLine[];
  midHorizontal: SnapMidHorizontalLine[];
  midVertical: SnapMidVerticalLine[];
}

export interface SnapEdgeLines {
  top?: SnapHorizontalLine;
  bottom?: SnapHorizontalLine;
  left?: SnapVerticalLine;
  right?: SnapVerticalLine;
  midHorizontal?: SnapMidHorizontalLine;
  midVertical?: SnapMidVerticalLine;
}

export interface AlignRect {
  rect: Rectangle;
  sourceNodeId: string;
}

export interface AlignRects {
  top: AlignRect[];
  bottom: AlignRect[];
  left: AlignRect[];
  right: AlignRect[];
}

export interface AlignSpacing {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  midHorizontal?: number;
  midVertical?: number;
}

export interface SnapEvent {
  snapEdgeLines: SnapEdgeLines;
  snapRect: Rectangle;
  alignRects: AlignRects;
  alignSpacing: AlignSpacing;
}

export interface WorkflowSnapServiceOptions {
  edgeThreshold: number;
  gridSize: number;
  enableGridSnapping: boolean;
  enableEdgeSnapping: boolean;
  enableMultiSnapping: boolean;
  enableOnlyViewportSnapping: boolean;
}

export interface WorkflowSnapLayerOptions {
  edgeColor: string;
  alignColor: string;
  edgeLineWidth: number;
  alignLineWidth: number;
  alignCrossWidth: number;
}

export type FreeSnapPluginOptions = Partial<WorkflowSnapServiceOptions & WorkflowSnapLayerOptions>;
