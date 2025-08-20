/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type IPoint } from '@flowgram.ai/utils';
import { LinePoint, LinePointLocation } from '@flowgram.ai/free-layout-core';

function getControlOffset(distance: number, curvature: number): number {
  if (distance >= 0) {
    return 0.5 * distance;
  }

  return curvature * 25 * Math.sqrt(-distance);
}

function getControlWithCurvature({
  location,
  x1,
  y1,
  x2,
  y2,
  curvature,
}: {
  location: LinePointLocation;
  curvature: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}): IPoint {
  switch (location) {
    case 'left':
      return {
        x: x1 - getControlOffset(x1 - x2, curvature),
        y: y1,
      };
    case 'right':
      return {
        x: x1 + getControlOffset(x2 - x1, curvature),
        y: y1,
      };
    case 'top':
      return {
        x: x1,
        y: y1 - getControlOffset(y1 - y2, curvature),
      };
    case 'bottom':
      return {
        x: x1,
        y: y1 + getControlOffset(y2 - y1, curvature),
      };
  }
}

export function getBezierControlPoints(
  fromPos: LinePoint,
  toPos: LinePoint,
  curvature = 0.25
): IPoint[] {
  const fromControl = getControlWithCurvature({
    location: fromPos.location,
    x1: fromPos.x,
    y1: fromPos.y,
    x2: toPos.x,
    y2: toPos.y,
    curvature,
  });
  const toControl = getControlWithCurvature({
    location: toPos.location,
    x1: toPos.x,
    y1: toPos.y,
    x2: fromPos.x,
    y2: fromPos.y,
    curvature,
  });
  return [fromControl, toControl];
}
