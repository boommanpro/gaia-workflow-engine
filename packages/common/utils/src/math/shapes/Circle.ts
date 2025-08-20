/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { SHAPES } from '../const';
import { Rectangle } from './Rectangle';

/**
 * The Circle object is used to help draw graphics and can also be used to specify a hit area for displayObjects.
 */
export class Circle {
  /**
   * The type of the object, mainly used to avoid `instanceof` checks
   */
  public readonly type = SHAPES.CIRC;

  /**
   * @param x Circle center x
   * @param y Circle center y
   */
  constructor(public x = 0, public y = 0, public radius = 0) {}

  /**
   * Creates a clone of this Circle instance
   *
   * @return a copy of the Circle
   */
  clone(): Circle {
    return new Circle(this.x, this.y, this.radius);
  }

  /**
   * Checks whether the x and y coordinates given are contained within this circle
   *
   * @return Whether the (x, y) coordinates are within this Circle
   */
  contains(x: number, y: number): boolean {
    if (this.radius <= 0) {
      return false;
    }

    const r2 = this.radius * this.radius;
    let dx = this.x - x;
    let dy = this.y - y;

    dx *= dx;
    dy *= dy;

    return dx + dy <= r2;
  }

  /**
   * Returns the framing rectangle of the circle as a Rectangle object
   *
   * @return the framing rectangle
   */
  getBounds(): Rectangle {
    return new Rectangle(
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2,
    );
  }
}
