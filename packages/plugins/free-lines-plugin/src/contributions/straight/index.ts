/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Point, Rectangle } from '@flowgram.ai/utils';
import {
  WorkflowLineEntity,
  WorkflowLineRenderContribution,
  LinePoint,
  LineCenterPoint,
  getLineCenter,
  LineType,
} from '@flowgram.ai/free-layout-core';

import { LINE_PADDING } from '../../constants/lines';
import { projectPointOnLine } from './point-on-line';
import { posWithShrink } from '../utils';

export interface StraightData {
  points: IPoint[];
  path: string;
  bbox: Rectangle;
  center: LineCenterPoint;
}

export class WorkflowStraightLineContribution implements WorkflowLineRenderContribution {
  public static type = LineType.STRAIGHT;

  public entity: WorkflowLineEntity;

  constructor(entity: WorkflowLineEntity) {
    this.entity = entity;
  }

  private data?: StraightData;

  public get path(): string {
    return this.data?.path ?? '';
  }

  public calcDistance(pos: IPoint): number {
    if (!this.data) {
      return Number.MAX_SAFE_INTEGER;
    }
    const [start, end] = this.data.points;
    return Point.getDistance(pos, projectPointOnLine(pos, start, end));
  }

  public get bounds(): Rectangle {
    if (!this.data) {
      return new Rectangle();
    }
    return this.data.bbox;
  }

  get center() {
    return this.data?.center;
  }

  public update(params: { fromPos: LinePoint; toPos: LinePoint }): void {
    const { fromPos, toPos } = params;
    const shrink = this.entity.uiState.shrink;

    // 根据方向预先计算源点和目标点的偏移
    const source = posWithShrink(fromPos, fromPos.location, shrink);
    const target = posWithShrink(toPos, toPos.location, shrink);

    const points = [source, target];

    const bbox = Rectangle.createRectangleWithTwoPoints(points[0], points[1]);

    // 调整所有点到 SVG 视口坐标系
    const adjustedPoints = points.map((p) => ({
      x: p.x - bbox.x + LINE_PADDING,
      y: p.y - bbox.y + LINE_PADDING,
    }));

    // 生成直线路径
    const path = `M ${adjustedPoints[0].x} ${adjustedPoints[0].y} L ${adjustedPoints[1].x} ${adjustedPoints[1].y}`;

    this.data = {
      points,
      path,
      bbox,
      center: getLineCenter(fromPos, toPos, bbox, LINE_PADDING),
    };
  }
}
