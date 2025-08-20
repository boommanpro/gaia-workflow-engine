/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ConstantKeys } from '@flowgram.ai/document';

export enum LoopTypeEnum {
  LOOP_LEFT_EMPTY_BLOCK = 'loopLeftEmptyBlock',
  LOOP_RIGHT_EMPTY_BLOCK = 'loopRightEmptyBlock',
  LOOP_EMPTY_BRANCH = 'loopEmptyBranch',
}

export const LoopSpacings = {
  SPACING: 16, // 距离下面节点距离
  COLLAPSE_INLINE_SPACING_BOTTOM: 60, // 距离下面节点距离
  [ConstantKeys.INLINE_SPACING_BOTTOM]: 48, // 下边空白
  MIN_INLINE_BLOCK_SPACING: 280, // 最小循环圈宽度
  HORIZONTAL_MIN_INLINE_BLOCK_SPACING: 180, // 水平布局下的最小循环圈高度
  LEFT_EMPTY_BLOCK_WIDTH: 80, // 左边空分支宽度
  EMPTY_BRANCH_SPACING: 20, // 左边空分支宽度
  LOOP_BLOCK_ICON_SPACING: 13, // inlineBlocks 的 inlineBottom
  [ConstantKeys.INLINE_BLOCKS_INLINE_SPACING_BOTTOM]: 23, // inlineBlocks 的 inlineBottom
  INLINE_BLOCKS_INLINE_SPACING_TOP: 30, // inlineBlocks 的 inlineTop
};
