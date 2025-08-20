/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { IPoint } from './IPoint';

/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents
 * the horizontal axis and y represents the vertical axis.
 *
 * @class
 * @memberof PIXI
 * @implements IPoint
 */
export class Point implements IPoint {
  constructor(public x = 0, public y = 0) {}

  /**
   * Creates a clone of this point
   *
   * @return {Point} a copy of the point
   */
  clone(): Point {
    return new Point(this.x, this.y);
  }

  /**
   * Copies x and y from the given point
   *
   * @param {IPoint} p - The point to copy from
   * @returns {this} Returns itself.
   */
  copyFrom(p: IPoint): this {
    this.set(p.x, p.y);

    return this;
  }

  /**
   * Copies x and y into the given point
   *
   * @param {IPoint} p - The point to copy.
   * @returns {IPoint} Given point with values updated
   */
  copyTo<T extends IPoint>(p: T): T {
    p.x = this.x;
    p.y = this.y;

    return p;
  }

  /**
   * Returns true if the given point is equal to this point
   *
   * @param {IPoint} p - The point to check
   * @returns {boolean} Whether the given point equal to this point
   */
  equals(p: IPoint): boolean {
    return p.x === this.x && p.y === this.y;
  }

  /**
   * Sets the point to a new x and y position.
   * If y is omitted, both x and y will be set to x.
   *
   * @param {number} [x=0] - position of the point on the x axis
   * @param {number} [y=x] - position of the point on the y axis
   * @returns {this} Returns itself.
   */
  set(x = 0, y = x): this {
    this.x = x;
    this.y = y;

    return this;
  }
}

export namespace Point {
  export const EMPTY: IPoint = { x: 0, y: 0 };

  /**
   * 获取两点间的距离
   * @param p1
   * @param p2
   */
  export function getDistance(p1: IPoint, p2: IPoint): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  /**
   * 获取两点间的中间点
   * @param p1
   * @param p2
   */
  export function getMiddlePoint(p1: IPoint, p2: IPoint): IPoint {
    return getRatioPoint(p1, p2, 0.5);
  }

  /**
   * 按一定比例，获取两点间的中间点
   * @param p1
   * @param p2
   */
  export function getRatioPoint(p1: IPoint, p2: IPoint, ratio: number): IPoint {
    return {
      x: p1.x + ratio * (p2.x - p1.x),
      y: p1.y + ratio * (p2.y - p1.y),
    };
  }

  export function fixZero(output: IPoint): IPoint {
    // fix: -0
    if (output.x === 0) output.x = 0;
    if (output.y === 0) output.y = 0;
    return output;
  }

  /**
   * 往目标点移动 distance 距离
   * @param current
   * @param direction
   */
  export function move(current: IPoint, m: Partial<IPoint>): IPoint {
    return {
      x: current.x + (m.x || 0),
      y: current.y + (m.y || 0),
    };
  }

  /**
   * 往目标点移动 distance 距离
   * @param current
   * @param direction
   */
  export function moveDistanceToDirection(
    current: IPoint,
    direction: IPoint,
    distance: number,
  ): IPoint {
    const deltaX = direction.x - current.x;
    const deltaY = direction.y - current.y;

    const distanceX = deltaX === 0 ? 0 : Math.sqrt(distance ** 2 / (1 + deltaY ** 2 / deltaX ** 2));
    const moveX = deltaX > 0 ? distanceX : -distanceX;
    const distanceY = deltaX === 0 ? distance : Math.abs((distanceX * deltaY) / deltaX);
    const moveY = deltaY > 0 ? distanceY : -distanceY;

    return {
      x: current.x + moveX,
      y: current.y + moveY,
    };
  }
}
