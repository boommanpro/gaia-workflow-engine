/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * 滚动条点击事件监听
 */
export const ScrollBarEvents = Symbol('ScrollBarEvents');

export interface ScrollBarEvents {
  dragStart: () => void;
}
