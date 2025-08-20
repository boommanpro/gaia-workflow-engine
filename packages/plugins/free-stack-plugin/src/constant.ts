/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum StackingItem {
  Line = 'line',
  Node = 'node',
}

export enum StackingType {
  Line = StackingItem.Line,
  Node = StackingItem.Node,
}

export const StackingBaseIndex: Record<StackingType, number> = {
  [StackingType.Line]: 0,
  [StackingType.Node]: 1,
};

// 常量
const startIndex = 8;
const allowLevel = 2;

// 计算值
const levelIndexStep = Object.keys(StackingType).length;
const maxLevel = allowLevel * 2;
const maxIndex = startIndex + maxLevel * levelIndexStep;

export const StackingConfig = {
  /** index 起始值 */
  startIndex,
  /** 允许存在的层级 */
  allowLevel,
  /** 每层 index 跨度 */
  levelIndexStep,
  /** 叠加计算后出现的最深层级 */
  maxLevel,
  /** 最大 index */
  maxIndex,
};
