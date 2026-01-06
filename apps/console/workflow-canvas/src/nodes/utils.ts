/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

/**
 * 生成符合Java变量命名规范的ID
 * 1. 以字母或下划线开头
 * 2. 只能包含字母、数字和下划线
 * 3. 不能包含特殊字符如连字符(-)
 *
 * @param prefix 前缀
 * @param length 随机部分长度
 * @returns 符合规范的ID
 */
export function generateValidId(prefix: string, length: number = 5): string {
  // 生成nanoid，然后替换掉特殊字符
  let randomPart = nanoid(length);

  // 替换掉连字符(-)等特殊字符
  randomPart = randomPart.replace(/[^a-zA-Z0-9_]/g, (match) => {
    // 将特殊字符映射为字母
    const charMap: { [key: string]: string } = {
      '-': 'x',
      '.': 'd',
      '~': 't',
      '*': 's',
      '!': 'e',
      '@': 'a',
      '#': 'h',
      $: 'u',
      '%': 'p',
      '^': 'c',
      '&': 'n',
      '+': 'p',
      '=': 'e',
      ':': 'o',
      ';': 's',
      '?': 'q',
      '/': 's',
      '\\': 'b',
      '|': 'i',
      '<': 'l',
      '>': 'g',
      ',': 'c',
      '[': 'b',
      ']': 'e',
      '{': 'c',
      '}': 'b',
      '(': 'p',
      ')': 'q',
      '"': 'q',
      "'": 'q',
      '`': 'b',
      ' ': 's',
    };
    return charMap[match] || 'x';
  });

  // 确保第一个字符不是数字
  if (/^[0-9]/.test(randomPart)) {
    randomPart = 'a' + randomPart.substring(1);
  }

  return `${prefix}_${randomPart}`;
}
