/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle, IPoint } from '@flowgram.ai/utils';

export type IRectDistance = (rectA: Rectangle, rectB: Rectangle) => IPoint;

/** 矩形间距 */
export const rectDistance: IRectDistance = (rectA, rectB) => {
  // 计算 x 轴距离
  const distanceX = Math.abs(Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
  // 计算 y 轴距离
  const distanceY = Math.abs(Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
  if (Rectangle.intersects(rectA, rectB)) {
    // 相交距离为负
    return {
      x: -distanceX,
      y: -distanceY,
    };
  }
  return {
    x: distanceX,
    y: distanceY,
  };
};
