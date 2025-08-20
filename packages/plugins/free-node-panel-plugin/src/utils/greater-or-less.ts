/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * 检查 a 是否大于 b，考虑浮点数精度问题
 * @param a 第一个数
 * @param b 第二个数
 * @returns 如果 a 大于 b 则返回 true，否则返回 false
 */
export const isGreaterThan = (a: number | undefined, b: number | undefined): boolean => {
  // 如果任一参数为 undefined，返回 false
  if (a === undefined || b === undefined) {
    return false;
  }

  // 定义一个很小的误差值
  const EPSILON: number = 0.00001;

  // 检查 a 是否显著大于 b
  return a - b > EPSILON;
};

/**
 * 检查 a 是否小于 b，考虑浮点数精度问题
 * @param a 第一个数
 * @param b 第二个数
 * @returns 如果 a 小于 b 则返回 true，否则返回 false
 */
export const isLessThan = (a: number | undefined, b: number | undefined): boolean => {
  // 如果任一参数为 undefined，返回 false
  if (a === undefined || b === undefined) {
    return false;
  }

  // 定义一个很小的误差值
  const EPSILON: number = 0.00001;

  // 检查 a 是否显著小于 b
  return b - a > EPSILON;
};
