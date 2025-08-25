/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { Rectangle, IPoint } from '@flowgram.ai/utils';

import { type WorkflowLineEntity } from '../entities';

export enum LineType {
  BEZIER, // 贝塞尔曲线
  LINE_CHART, // 折叠线
  STRAIGHT, // 直线
}

export type LineRenderType = LineType | string;

export type LinePointLocation = 'left' | 'top' | 'right' | 'bottom';

export interface LinePoint {
  x: number;
  y: number;
  location: LinePointLocation;
}

export interface LinePosition {
  from: LinePoint;
  to: LinePoint;
}

export interface LineColor {
  hidden: string;
  default: string;
  drawing: string;
  hovered: string;
  selected: string;
  error: string;
  flowing: string;
}

export enum LineColors {
  HIDDEN = 'var(--g-workflow-line-color-hidden,transparent)', // 隐藏线条
  DEFUALT = 'var(--g-workflow-line-color-default,#4d53e8)',
  DRAWING = 'var(--g-workflow-line-color-drawing, #5DD6E3)', // '#b5bbf8', // '#9197F1',
  HOVER = 'var(--g-workflow-line-color-hover,#37d0ff)',
  SELECTED = 'var(--g-workflow-line-color-selected,#37d0ff)',
  ERROR = 'var(--g-workflow-line-color-error,red)',
  FLOWING = 'var(--g-workflow-line-color-flowing,#4d53e8)', // 流动线条，默认使用主题色
}

export interface LineCenterPoint {
  x: number;
  y: number;
  labelX: number; // Relative to where the line begins
  labelY: number; // Relative to where the line begins
}

export interface WorkflowLineRenderContribution {
  entity: WorkflowLineEntity;
  path: string;
  center?: LineCenterPoint;
  bounds: Rectangle;
  update: (params: { fromPos: LinePoint; toPos: LinePoint }) => void;
  calcDistance: (pos: IPoint) => number;
}

export type WorkflowLineRenderContributionFactory = (new (
  entity: WorkflowLineEntity
) => WorkflowLineRenderContribution) & {
  type: LineRenderType;
};
