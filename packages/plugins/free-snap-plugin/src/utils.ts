/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Epsilon } from './constant';

/** 检查浮点数 a 是否等于 b */
export const isEqual = (a: number | undefined, b: number | undefined): boolean => {
  if (a === undefined || b === undefined) {
    return false;
  }
  // 检查 a 和 b 的差的绝对值是否小于 Epsilon
  return Math.abs(a - b) < Epsilon;
};

/** 检查浮点数 a 是否小于 b */
export const isLessThan = (a: number | undefined, b: number | undefined): boolean => {
  if (a === undefined || b === undefined) {
    return false;
  }
  // 检查 a 是否显著小于 b
  return b - a > Epsilon;
};

/** 检查浮点数 a 是否大于 b */
export const isGreaterThan = (a: number | undefined, b: number | undefined): boolean => {
  if (a === undefined || b === undefined) {
    return false;
  }
  return a - b > Epsilon;
};

/** 检查浮点数 a 是否小于等于 b */
export const isLessThanOrEqual = (a: number | undefined, b: number | undefined): boolean =>
  isEqual(a, b) || isLessThan(a, b);

/** 检查浮点数 a 是否大于等于 b */
export const isGreaterThanOrEqual = (a: number | undefined, b: number | undefined): boolean =>
  isEqual(a, b) || isGreaterThan(a, b);

/** 检查值是否是数字类型 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);
