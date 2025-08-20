/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * tryCatch 自定义类型
 */
export enum TryCatchTypeEnum {
  MAIN_INLINE_BLOCKS = 'mainInlineBlocks',
  CATCH_INLINE_BLOCKS = 'catchInlineBlocks',
  TRY_BLOCK = 'tryBlock',
  TRY_SLOT = 'trySlot',
  CATCH_BLOCK = 'catchBlock',
}

export enum TryCatchSpacings {
  INLINE_SPACING_TOP = 54, // 上边空白
  INLINE_SPACING_BOTTOM = 0, // 下边空白
  TRY_START_LABEL_DELTA = -20, // try 开始标签偏移
  TRY_END_LABEL_DELTA = -20, // try 结束标签偏移
  CATCH_INLINE_SPACING = 20, //  Catch 分支的上边间隙
  // lint-fix: 这里枚举重复了，但是看语义定义两个 key 是合理的。因此 disabled 处理
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  MAIN_INLINE_SPACING_TOP = 20,
  MAIN_INLINE_SPACING_BOTTOM = 40, // main 分支下边留白，不然会遮挡 "监控结束"标签
}
