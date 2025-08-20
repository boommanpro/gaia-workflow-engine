/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle } from '@flowgram.ai/utils';

export const isRectIntersects = (rectA: Rectangle, rectB: Rectangle): boolean => {
  // 检查水平方向是否有重叠
  const hasHorizontalOverlap = rectA.right > rectB.left && rectA.left < rectB.right;
  // 检查垂直方向是否有重叠
  const hasVerticalOverlap = rectA.bottom > rectB.top && rectA.top < rectB.bottom;
  // 只有当水平和垂直方向都有重叠时,两个矩形才相交
  return hasHorizontalOverlap && hasVerticalOverlap;
};
