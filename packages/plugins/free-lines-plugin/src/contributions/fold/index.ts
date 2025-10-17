/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';
import {
  WorkflowLineEntity,
  WorkflowLineRenderContribution,
  LinePoint,
  LineCenterPoint,
} from '@flowgram.ai/free-layout-core';
import { LineType } from '@flowgram.ai/free-layout-core';

import { posWithShrink, toRelative } from '../utils';
import { FoldLine } from './fold-line';

export interface FoldData {
  points: IPoint[];
  path: string;
  bbox: Rectangle;
  center: LineCenterPoint;
}

export class WorkflowFoldLineContribution implements WorkflowLineRenderContribution {
  public static type = LineType.LINE_CHART;

  public entity: WorkflowLineEntity;

  constructor(entity: WorkflowLineEntity) {
    this.entity = entity;
  }

  private data?: FoldData;

  public get path(): string {
    return this.data?.path ?? '';
  }

  public calcDistance(pos: IPoint): number {
    if (!this.data) {
      return Number.MAX_SAFE_INTEGER;
    }
    return FoldLine.getFoldLineToPointDistance(this.data.points, pos);
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

    const { points, center } = FoldLine.getPoints({
      source: {
        ...source,
        location: fromPos.location,
      },
      target: {
        ...target,
        location: toPos.location,
      },
    });

    const bbox = FoldLine.getBounds(points);

    // 调整所有点到 SVG 视口坐标系
    const adjustedPoints = points.map((p) => toRelative(p, bbox));

    const path = FoldLine.getSmoothStepPath(adjustedPoints);

    const relativeCenter = toRelative(center, bbox);
    this.data = {
      points,
      path,
      bbox,
      center: {
        x: center.x,
        y: center.y,
        labelX: relativeCenter.x,
        labelY: relativeCenter.y,
      },
    };
  }
}
