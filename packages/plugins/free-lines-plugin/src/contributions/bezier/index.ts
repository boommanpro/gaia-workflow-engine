/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Bezier } from 'bezier-js';
import { IPoint, Point, Rectangle } from '@flowgram.ai/utils';
import {
  WorkflowLineEntity,
  WorkflowLineRenderContribution,
  LinePoint,
} from '@flowgram.ai/free-layout-core';
import { LineType } from '@flowgram.ai/free-layout-core';

import { LINE_PADDING } from '../../constants/lines';
import { getBezierControlPoints } from './bezier-controls';

export interface BezierData {
  fromPos: IPoint;
  toPos: IPoint;
  bbox: Rectangle; // 外围矩形
  controls: IPoint[]; // 控制点
  bezier: Bezier;
  path: string;
}

export class WorkflowBezierLineContribution implements WorkflowLineRenderContribution {
  public static type = LineType.BEZIER;

  public entity: WorkflowLineEntity;

  constructor(entity: WorkflowLineEntity) {
    this.entity = entity;
  }

  private data?: BezierData;

  public get path(): string {
    return this.data?.path ?? '';
  }

  public calcDistance(pos: IPoint): number {
    if (!this.data) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Point.getDistance(pos, this.data.bezier.project(pos));
  }

  public get bounds(): Rectangle {
    if (!this.data) {
      return new Rectangle();
    }
    return this.data.bbox;
  }

  public update(params: { fromPos: LinePoint; toPos: LinePoint }): void {
    this.data = this.calcBezier(params.fromPos, params.toPos);
  }

  private calcBezier(fromPos: LinePoint, toPos: LinePoint): BezierData {
    const controls = getBezierControlPoints(fromPos, toPos, this.entity.uiState.curvature);
    const bezier = new Bezier([fromPos, ...controls, toPos]);
    const bbox = bezier.bbox();
    const bboxBounds = new Rectangle(
      bbox.x.min,
      bbox.y.min,
      bbox.x.max - bbox.x.min,
      bbox.y.max - bbox.y.min
    );

    const path = this.getPath({ bbox: bboxBounds, fromPos, toPos, controls });

    this.data = {
      fromPos,
      toPos,
      bezier,
      bbox: bboxBounds,
      controls,
      path,
    };
    return this.data;
  }

  private getPath(params: {
    bbox: Rectangle;
    fromPos: LinePoint;
    toPos: LinePoint;
    controls: IPoint[];
  }): string {
    const { bbox } = params;
    // 相对位置转换函数
    const toRelative = (p: IPoint): IPoint => ({
      x: p.x - bbox.x + LINE_PADDING,
      y: p.y - bbox.y + LINE_PADDING,
    });
    const fromPos = toRelative(params.fromPos);
    const toPos = toRelative(params.toPos);

    const controls = params.controls.map((c) => toRelative(c));
    const shrink = this.entity.uiState.shrink;

    const renderFromPos: IPoint =
      params.fromPos.location === 'bottom'
        ? { x: fromPos.x, y: fromPos.y + shrink }
        : { x: fromPos.x + shrink, y: fromPos.y };

    const renderToPos: IPoint =
      params.toPos.location === 'top'
        ? { x: toPos.x, y: toPos.y - shrink }
        : { x: toPos.x - shrink, y: toPos.y };

    const controlPoints = controls.map((s) => `${s.x} ${s.y}`).join(',');
    return `M${renderFromPos.x} ${renderFromPos.y} C ${controlPoints}, ${renderToPos.x} ${renderToPos.y}`;
  }
}
