/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isNil } from 'lodash-es';
export const isHidden = (dom?: HTMLElement) => {
  if (!dom || isNil(dom?.offsetParent)) {
    return true;
  }
  const style = window.getComputedStyle(dom);
  if (style?.display === 'none') {
    return true;
  }
  return false;
};

export const isRectInit = (rect?: DOMRect): boolean => {
  if (!rect) {
    return false;
  }
  // 检查所有属性是否都为0,表示DOMRect未初始化
  if (
    rect.bottom === 0 &&
    rect.height === 0 &&
    rect.left === 0 &&
    rect.right === 0 &&
    rect.top === 0 &&
    rect.width === 0 &&
    rect.x === 0 &&
    rect.y === 0
  ) {
    return false;
  }
  return true;
};
