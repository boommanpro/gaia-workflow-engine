/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Point, Rectangle } from '@flowgram.ai/utils';

import { getLineCenter } from '../src/utils/get-line-center';
import { LineCenterPoint, WorkflowLineRenderContribution } from '../src/typings';
import { POINT_RADIUS, WorkflowLineEntity } from '../src/entities';

const LINE_PADDING = 12;

export interface StraightData {
  points: IPoint[];
  path: string;
  bbox: Rectangle;
  center: LineCenterPoint;
}

export class WorkflowSimpleLineContribution implements WorkflowLineRenderContribution {
  public static type = 'SimpleLine';

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
    return Point.getDistance(pos, this.projectPointOnLine(pos, start, end));
  }

  public get bounds(): Rectangle {
    if (!this.data) {
      return new Rectangle();
    }
    return this.data.bbox;
  }

  get center() {
    return this.data!.center;
  }

  public update(params: { fromPos: IPoint; toPos: IPoint }): void {
    const { fromPos, toPos } = params;
    const { vertical } = this.entity;

    // 根据方向预先计算源点和目标点的偏移
    const sourceOffset = {
      x: vertical ? 0 : POINT_RADIUS,
      y: vertical ? POINT_RADIUS : 0,
    };
    const targetOffset = {
      x: vertical ? 0 : -POINT_RADIUS,
      y: vertical ? -POINT_RADIUS : 0,
    };

    const points = [
      {
        x: fromPos.x + sourceOffset.x,
        y: fromPos.y + sourceOffset.y,
      },
      {
        x: toPos.x + targetOffset.x,
        y: toPos.y + targetOffset.y,
      },
    ];

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

  private projectPointOnLine(point: IPoint, lineStart: IPoint, lineEnd: IPoint): IPoint {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    // 如果是垂直线
    if (dx === 0) {
      return { x: lineStart.x, y: point.y };
    }
    // 如果是水平线
    if (dy === 0) {
      return { x: point.x, y: lineStart.y };
    }

    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    return {
      x: lineStart.x + clampedT * dx,
      y: lineStart.y + clampedT * dy,
    };
  }
}
