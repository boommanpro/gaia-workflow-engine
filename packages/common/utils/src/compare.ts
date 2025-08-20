/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export namespace Compare {
  /**
   * 比较，默认浅比较
   * @param oldProps
   * @param newProps
   * @param depth - 比较的深度，默认是 1
   * @param partial - 比较对象的局部，默认 true
   */
  export function isChanged(oldProps: any, newProps: any, depth = 1, partial = true): boolean {
    if (oldProps === newProps) return false;
    if (depth === 0 || typeof oldProps !== 'object' || typeof newProps !== 'object') {
      return oldProps !== newProps;
    }
    const keys = Object.keys(newProps);
    if (!partial) {
      const oldKeys = Object.keys(oldProps);
      if (keys.length !== oldKeys.length) return true;
    }
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (isChanged(oldProps[key], newProps[key], depth - 1, partial)) return true;
    }
    return false;
  }
  /**
   * 深度比较
   * @param oldProps
   * @param newProps
   * @param partial - 比较对象的局部，默认 true
   */
  export function isDeepChanged(oldProps: any, newProps: any, partial?: boolean): boolean {
    return isChanged(oldProps, newProps, Infinity, partial);
  }
  export function isArrayShallowChanged(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return true;
    for (let i = 0, len = arr1.length; i < len; i++) {
      if (arr1[i] !== arr2[i]) {
        return true;
      }
    }
    return false;
  }
}
