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
  LineCenterPoint,
} from '@flowgram.ai/free-layout-core';
import { LineType } from '@flowgram.ai/free-layout-core';

import { posWithShrink, toRelative } from '../utils';
import { getBezierControlPoints } from './bezier-controls';

export interface BezierData {
  fromPos: IPoint;
  toPos: IPoint;
  bbox: Rectangle; // 外围矩形
  controls: IPoint[]; // 控制点
  bezier: Bezier;
  path: string;
  center: LineCenterPoint;
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
      return Rectangle.EMPTY;
    }
    return this.data.bbox;
  }

  get center() {
    return this.data?.center;
  }

  public update(params: { fromPos: LinePoint; toPos: LinePoint }): void {
    this.data = this.calcBezier(params.fromPos, params.toPos);
  }

  private calcBezier(fromPos: LinePoint, toPos: LinePoint): BezierData {
    const { controls, center } = getBezierControlPoints(
      fromPos,
      toPos,
      this.entity.uiState.curvature
    );
    const bezier = new Bezier([fromPos, ...controls, toPos]);
    const bbox = bezier.bbox();
    const bboxBounds = new Rectangle(
      bbox.x.min,
      bbox.y.min,
      bbox.x.max - bbox.x.min,
      bbox.y.max - bbox.y.min
    );
    const centerPoint = toRelative(center, bboxBounds);

    const path = this.getPath({ bbox: bboxBounds, fromPos, toPos, controls });

    this.data = {
      fromPos,
      toPos,
      bezier,
      bbox: bboxBounds,
      controls,
      path,
      center: {
        ...center,
        labelX: centerPoint.x,
        labelY: centerPoint.y,
      },
    };
    return this.data;
  }

  private getPath(params: {
    bbox: Rectangle;
    fromPos: LinePoint;
    toPos: LinePoint;
    controls: [IPoint, IPoint];
  }): string {
    const { bbox } = params;
    // 相对位置转换函数
    const fromPos = toRelative(params.fromPos, bbox);
    const toPos = toRelative(params.toPos, bbox);

    const controls = params.controls.map((c) => toRelative(c, bbox));
    const shrink = this.entity.uiState.shrink;

    const renderFromPos: IPoint = posWithShrink(fromPos, params.fromPos.location, shrink);

    const renderToPos: IPoint = posWithShrink(toPos, params.toPos.location, shrink);

    const controlPoints = controls.map((s) => `${s.x} ${s.y}`).join(',');
    return `M${renderFromPos.x} ${renderFromPos.y} C ${controlPoints}, ${renderToPos.x} ${renderToPos.y}`;
  }
}
