/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export class Vector2 {
  constructor(public x = 0, public y = 0) {}

  /**
   * 向量减法
   */
  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /**
   * 向量点乘
   */
  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * 向量叉乘
   */
  // cross(v: Vector2): number {
  // }
}
