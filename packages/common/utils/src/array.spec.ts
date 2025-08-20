/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { arrayToSet, arrayUnion, iterToArray } from './array';

describe('array', () => {
  test('arrayToSet', async () => {
    expect([...arrayToSet([])]).toEqual([]);
    expect([...arrayToSet([1])]).toEqual([1]);
    expect([...arrayToSet([1, 2])]).toEqual([1, 2]);
    expect([...arrayToSet([1, undefined, 3])]).toEqual([1, undefined, 3]);

    expect(arrayToSet([1, 2]).has(2)).toBeTruthy();
  });

  test('iterToArray', async () => {
    expect(iterToArray(arrayToSet([]).values())).toEqual([]);
    expect(iterToArray(arrayToSet([1]).values())).toEqual([1]);
    expect(iterToArray(arrayToSet([1, 2]).values())).toEqual([1, 2]);
    expect(iterToArray(arrayToSet([1, undefined, 3]).values())).toEqual([1, undefined, 3]);
  });

  test('arrayUnion', async () => {
    expect(arrayUnion([])).toEqual([]);

    expect(arrayUnion([1])).toEqual([1]);
    expect(arrayUnion([1, 2])).toEqual([1, 2]);
    expect(arrayUnion([1, 2, 1])).toEqual([1, 2]);

    expect(arrayUnion([''])).toEqual(['']);
    expect(arrayUnion(['1'])).toEqual(['1']);
    expect(arrayUnion(['1', '2'])).toEqual(['1', '2']);
    expect(arrayUnion(['1', '2', '1'])).toEqual(['1', '2']);
  });
});
