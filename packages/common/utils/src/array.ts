/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export function iterToArray<T = any>(iter: IterableIterator<T>): T[] {
  const result = [];
  for (const v of iter) {
    result.push(v);
  }
  return result;
}

export function arrayToSet(arr: any[]): Set<any> {
  const set = new Set();
  for (let i = 0, len = arr.length; i < len; i++) {
    set.add(arr[i]);
  }
  return set;
}

/**
 * @see https://stackoverflow.com/a/9229821
 *  export function arrayUnion(arr: any[]): any[] {
 *     return [...new Set(arr)]
 *  }
 */
export function arrayUnion(arr: any[]): any[] {
  const result: any[] = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    if (!result.includes(arr[i])) result.push(arr[i]);
  }
  return result;
}
