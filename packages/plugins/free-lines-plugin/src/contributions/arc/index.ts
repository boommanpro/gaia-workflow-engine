/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Point, Rectangle } from '@flowgram.ai/utils';
import {
  POINT_RADIUS,
  WorkflowLineEntity,
  WorkflowLineRenderContribution,
} from '@flowgram.ai/free-layout-core';

import { LINE_PADDING } from '../../constants/lines';

export interface ArcData {
  fromPos: IPoint;
  toPos: IPoint;
  path: string;
  bbox: Rectangle;
}

export class WorkflowArkLineContribution implements WorkflowLineRenderContribution {
  public static type = 'WorkflowArkLineContribution';

  public entity: WorkflowLineEntity;

  constructor(entity: WorkflowLineEntity) {
    this.entity = entity;
  }

  private data?: ArcData;

  public get path(): string {
    return this.data?.path ?? '';
  }

  public calcDistance(pos: IPoint): number {
    if (!this.data) {
      return Number.MAX_SAFE_INTEGER;
    }

    const { fromPos, toPos, bbox } = this.data;

    // 首先检查点是否在包围盒范围内
    if (!bbox.contains(pos.x, pos.y)) {
      // 如果点在包围盒外，计算到包围盒边界的最短距离
      const dx = Math.max(bbox.x - pos.x, 0, pos.x - (bbox.x + bbox.width));
      const dy = Math.max(bbox.y - pos.y, 0, pos.y - (bbox.y + bbox.height));
      return Math.sqrt(dx * dx + dy * dy);
    }

    // 计算圆弧的中心点和半径
    const center = {
      x: (fromPos.x + toPos.x) / 2,
      y: (fromPos.y + toPos.y) / 2,
    };
    const radius = Point.getDistance(fromPos, center);

    // 计算点到圆心的距离
    const distanceToCenter = Point.getDistance(pos, center);

    // 返回点到圆弧的近似距离
    return Math.abs(distanceToCenter - radius);
  }

  public get bounds(): Rectangle {
    if (!this.data) {
      return new Rectangle();
    }
    return this.data.bbox;
  }

  public update(params: { fromPos: IPoint; toPos: IPoint }): void {
    const { fromPos, toPos } = params;
    const { vertical } = this.entity;

    const sourceOffset = {
      x: vertical ? 0 : POINT_RADIUS,
      y: vertical ? POINT_RADIUS : 0,
    };
    const targetOffset = {
      x: vertical ? 0 : -POINT_RADIUS,
      y: vertical ? -POINT_RADIUS : 0,
    };

    const start = {
      x: fromPos.x + sourceOffset.x,
      y: fromPos.y + sourceOffset.y,
    };
    const end = {
      x: toPos.x + targetOffset.x,
      y: toPos.y + targetOffset.y,
    };

    // 计算圆弧的包围盒
    const bbox = this.calculateArcBBox(start, end);

    // 生成圆弧路径
    const path = this.getArcPath(start, end, bbox);

    this.data = {
      fromPos: start,
      toPos: end,
      path,
      bbox,
    };
  }

  private calculateArcBBox(start: IPoint, end: IPoint): Rectangle {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const radius = Math.sqrt(dx * dx + dy * dy) / 2;

    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;

    return new Rectangle(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }

  private getArcPath(start: IPoint, end: IPoint, bbox: Rectangle): string {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 调整点到相对坐标
    const startRel = {
      x: start.x - bbox.x + LINE_PADDING,
      y: start.y - bbox.y + LINE_PADDING,
    };
    const endRel = {
      x: end.x - bbox.x + LINE_PADDING,
      y: end.y - bbox.y + LINE_PADDING,
    };

    // 使用 SVG 圆弧命令
    return `M ${startRel.x} ${startRel.y} A ${distance / 2} ${distance / 2} 0 0 1 ${endRel.x} ${
      endRel.y
    }`;
  }
}
