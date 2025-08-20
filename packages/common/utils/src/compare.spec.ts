/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { Compare } from './compare';

const { isChanged, isDeepChanged, isArrayShallowChanged } = Compare;

describe('Compare', () => {
  test('isChanged', async () => {
    // base - types
    expect(isChanged({}, {})).toBeFalsy();
    expect(isChanged(1, 1)).toBeFalsy();
    expect(isChanged('1', '1')).toBeFalsy();
    expect(isChanged(true, true)).toBeFalsy();
    expect(isChanged(false, false)).toBeFalsy();
    const obj = { a: 1, b: 2 };
    expect(isChanged(obj, obj)).toBeFalsy();
    const arr = [1, 2];
    expect(isChanged(arr, arr)).toBeFalsy();

    // base
    expect(isChanged({ a: 1 }, { a: 2 })).toBeTruthy();
    const node = { v: 1, l: null, r: null };
    node.v = 2;
    expect(isChanged({ a: node }, { a: node })).toBeFalsy();
    expect(isChanged({ a: node }, { a: { ...node } })).toBeTruthy();
    const node1 = { v: 1, l: null, r: null };
    expect(isChanged({ a: node }, { a: node1 })).toBeTruthy();

    // depth
    expect(isChanged({ a: 1 }, { a: 1 }, 0)).toBeTruthy();
    expect(isChanged({ a: 1 }, { a: 1 }, 1)).toBeFalsy();
    expect(isChanged({ a: 1 }, { a: 1 }, 2)).toBeFalsy();
    expect(isChanged({ a: { b: 1 } }, { a: { b: 1 } }, 0)).toBeTruthy();
    expect(isChanged({ a: { b: 1 } }, { a: { b: 1 } }, 1)).toBeTruthy();
    expect(isChanged({ a: { b: 1 } }, { a: { b: 1 } }, 2)).toBeFalsy();

    // partial
    expect(isChanged({ a: 1 }, { a: 1, b: 2 }, 1)).toBeTruthy();
    expect(isChanged({ a: 1 }, { a: 1, b: 2 }, 1, false)).toBeTruthy();
  });

  test('isDeepChanged', async () => {
    expect(isDeepChanged({ a: 1 }, { a: 2 })).toBeTruthy();
    const node = { v: 1, l: null, r: null };
    expect(isDeepChanged({ a: node }, { a: node })).toBeFalsy();
    expect(isDeepChanged({ a: node }, { a: { ...node, v: 2 } })).toBeTruthy();
    const node1 = { v: 1, l: null, r: null };
    expect(isDeepChanged({ a: node }, { a: node1 })).toBeFalsy();
  });

  test('isArrayShallowChanged', async () => {
    expect(isArrayShallowChanged([], [1])).toBeTruthy();
    expect(isArrayShallowChanged([1], [])).toBeTruthy();
    expect(isArrayShallowChanged([1], [1, 2])).toBeTruthy();
    expect(isArrayShallowChanged([1, 2], [1, 3])).toBeTruthy();
    expect(isArrayShallowChanged([{}], [{}])).toBeTruthy();
    expect(isArrayShallowChanged([{ a: 1 }], [{ a: 1 }])).toBeTruthy();

    expect(isArrayShallowChanged([], [])).toBeFalsy();
    expect(isArrayShallowChanged([1], [1])).toBeFalsy();
    expect(isArrayShallowChanged([1, null, 3], [1, null, 3])).toBeFalsy();
    const obj = {};
    expect(isArrayShallowChanged([obj], [obj])).toBeFalsy();
    const obj1 = { a: 1, b: 2 };
    expect(isArrayShallowChanged([obj1], [obj1])).toBeFalsy();
  });
});
