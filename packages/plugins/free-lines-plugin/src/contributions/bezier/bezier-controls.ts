/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type IPoint } from '@flowgram.ai/utils';
import { LinePoint, LinePointLocation } from '@flowgram.ai/free-layout-core';

/**
 * Fork from: https://github.com/xyflow/xyflow/blob/main/packages/system/src/utils/edges/bezier-edge.ts
 * MIT License
 * Copyright (c) 2019-2024 webkid GmbH
 */
export function getBezierEdgeCenter(
  fromPos: IPoint,
  toPos: IPoint,
  fromControl: IPoint,
  toControl: IPoint
): IPoint {
  /*
   * cubic bezier t=0.5 mid point, not the actual mid point, but easy to calculate
   * https://stackoverflow.com/questions/67516101/how-to-find-distance-mid-point-of-bezier-curve
   */
  const x = fromPos.x * 0.125 + fromControl.x * 0.375 + toControl.x * 0.375 + toPos.x * 0.125;
  const y = fromPos.y * 0.125 + fromControl.y * 0.375 + toControl.y * 0.375 + toPos.y * 0.125;
  return {
    x,
    y,
  };
}

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
): { controls: [IPoint, IPoint]; center: IPoint } {
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
  const center = getBezierEdgeCenter(fromPos, toPos, fromControl, toControl);
  return {
    controls: [fromControl, toControl],
    center,
  };
}
