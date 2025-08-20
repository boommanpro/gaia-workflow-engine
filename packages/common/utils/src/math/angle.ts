/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { wrap as mathWrap } from './wrap';
import { type IPoint } from './IPoint';

export namespace Angle {
  /**
   * Wrap an angle.
   *
   * Wraps the angle to a value in the range of -PI to PI.
   *
   * @param angle - The angle to wrap, in radians.
   * @return The wrapped angle, in radians.
   */
  export function wrap(angle: number): number {
    return mathWrap(angle, -Math.PI, Math.PI);
  }
  /**
   * Wrap an angle in degrees.
   *
   * Wraps the angle to a value in the range of -180 to 180.
   *
   * @param angle - The angle to wrap, in degrees.
   * @return The wrapped angle, in degrees.
   */
  export function wrapDegrees(angle: number): number {
    return mathWrap(angle, -180, 180);
  }

  /**
   * 计算两个点的夹角
   *
   * @return The angle in radians.
   */
  export function betweenPoints(
    point1: IPoint,
    point2: IPoint,
    originPoint: IPoint = { x: 0, y: 0 },
  ): number {
    const p1 = {
      x: point1.x - originPoint.x,
      y: point1.y - originPoint.y,
    };
    const p2 = {
      x: point2.x - originPoint.x,
      y: point2.y - originPoint.y,
    };
    // return Math.atan2(p2.y, p2.x) - Math.atan2(p1.y, p1.x)
    return Math.atan2(p1.x * p2.y - p1.y * p2.x, p1.x * p2.x + p1.y * p2.y);
  }
}
