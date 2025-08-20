/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';

export interface StraightData {
  points: IPoint[];
  path: string;
  bbox: Rectangle;
}

/**
 * 计算点到直线的投影点
 */
export function projectPointOnLine(point: IPoint, lineStart: IPoint, lineEnd: IPoint): IPoint {
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
