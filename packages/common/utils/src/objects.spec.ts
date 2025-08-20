/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import {
  NOOP,
  deepFreeze,
  each,
  filter,
  getByKey,
  isEmpty,
  isPlainObject,
  mapKeys,
  mapValues,
  notEmpty,
  omit,
  pick,
  reduce,
  setByKey,
  values,
} from './objects';

describe('objects', () => {
  test('deepFreeze', async () => {
    const obj1 = { a: { b: 2 } };
    deepFreeze(obj1);
    expect(() => {
      obj1.a.b = 3;
    }).toThrow();

    expect(deepFreeze(null)).toBeNull();
    expect(deepFreeze(1)).toEqual(1);
  });

  test('notEmpty', async () => {
    expect(notEmpty({})).toBeTruthy();
    expect(notEmpty([])).toBeTruthy();
    expect(notEmpty(() => {})).toBeTruthy();

    expect(notEmpty(undefined)).toBeFalsy();
    expect(notEmpty(null)).toBeFalsy();
  });

  test('isEmpty', async () => {
    expect(isEmpty({})).toBeTruthy();
    expect(isEmpty({ a: 1 })).toBeFalsy();

    // WARNING: just for plain object
    expect(isEmpty(() => 1)).toBeFalsy();
  });

  const obj = Object.freeze({ a: 1, b: 2, c: 3 });

  test('each', async () => {
    const ret: any[] = [];
    each(obj, (v, k) => ret.push([k, v]));
    expect(ret).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  test('values', async () => {
    expect(values(obj)).toEqual([1, 2, 3]);

    const _values = Object.values;
    Object.values = null as any;
    expect(values(obj)).toEqual([1, 2, 3]);
    Object.values = _values;
  });

  test('filter', async () => {
    expect(filter(obj, (v, k) => v > 1)).toEqual({ b: 2, c: 3 });
    const dest = {};
    expect(filter(obj, (v, k) => v > 1, dest)).toEqual({ b: 2, c: 3 });
    expect(dest).toEqual({ b: 2, c: 3 });
  });

  test('pick', async () => {
    expect(pick(obj, ['b', 'c'])).toEqual({ b: 2, c: 3 });
    expect(pick(obj, ['a', 'b', 'c'])).toEqual(obj);
    expect(pick(obj, [])).toEqual({});

    const dest = {};
    expect(pick(obj, ['b', 'c'], dest)).toEqual({ b: 2, c: 3 });
    expect(dest).toEqual({ b: 2, c: 3 });
  });

  test('omit', async () => {
    expect(omit(obj, ['a'])).toEqual({ b: 2, c: 3 });
    expect(omit(obj, ['a', 'b', 'c', 'd'])).toEqual({});
    expect(omit(obj, [])).toEqual(obj);

    const dest = {};
    expect(omit(obj, ['a'], dest)).toEqual({ b: 2, c: 3 });
    expect(dest).toEqual({ b: 2, c: 3 });
  });

  test('reduce', async () => {
    // sum
    expect(reduce(obj, (res, v) => res + v, 0)).toEqual(6);

    // v + 1
    expect(
      reduce(obj, (res, v, k) => {
        res[k] = v + 1;
        return res;
      }),
    ).toEqual({ a: 2, b: 3, c: 4 });

    // entries
    expect(
      reduce(
        obj,
        (res, v, k) => {
          res.push([k, v]);
          return res;
        },
        [] as [string, number][],
      ),
    ).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  test('mapValues', async () => {
    expect(mapValues(obj, v => v + 1)).toEqual({ a: 2, b: 3, c: 4 });
    expect(mapValues(obj, (v, k) => `${k}${v}`)).toEqual({
      a: 'a1',
      b: 'b2',
      c: 'c3',
    });
  });

  test('mapKeys', async () => {
    expect(mapKeys(obj, (v, k) => `${k}1`)).toEqual({ a1: 1, b1: 2, c1: 3 });
    expect(mapKeys(obj, (v, k) => `${k}${v}`)).toEqual({ a1: 1, b2: 2, c3: 3 });
  });

  test('getByKey', async () => {
    const obj1 = Object.freeze({ a: { b: { c: 1 } } });

    expect(getByKey(obj1, 'a.b.c')).toEqual(1);
    expect(getByKey(obj1, 'a.b')).toEqual({ c: 1 });
    expect(getByKey(obj1, 'a')).toEqual({ b: { c: 1 } });

    // return undefined
    expect(getByKey(1, 'a')).toBeUndefined();
    expect(getByKey(obj1, '')).toBeUndefined();
    expect(getByKey(obj1, 'b')).toBeUndefined();
    expect(getByKey(obj1, 'a.d')).toBeUndefined();
    expect(getByKey(obj1, 'a.d.e')).toBeUndefined();
    expect(getByKey(obj1, 'a.b.c.d')).toBeUndefined();
  });

  test('setByKey', async () => {
    expect(setByKey({ a: { b: { c: 1 } } }, 'a.b.c', 2)).toEqual({
      a: { b: { c: 2 } },
    });
    const obj1 = { a: { b: { c: 1 } } };
    expect(setByKey(obj1, 'a.b.c', 2, true, true)).toEqual({
      a: { b: { c: 2 } },
    });
    expect(obj1).toEqual({ a: { b: { c: 1 } } });
    const arr = [1] as any;
    arr.b = 2;
    expect(setByKey({ a: [1] }, 'a.b', 2, true, true)).toEqual({ a: arr });

    expect(setByKey(1, 'a.b.c', 2)).toEqual(1);
    expect(setByKey({ a: { b: { c: 1 } } }, '', 2)).toEqual({
      a: { b: { c: 1 } },
    });
    expect(setByKey({ a: { b: { c: 1 } } }, 'a.b.d', 2)).toEqual({
      a: { b: { c: 1, d: 2 } },
    });
    expect(setByKey({ a: { b: { c: 1 } } }, 'a.b.d', 2, false)).toEqual({
      a: { b: { c: 1, d: 2 } },
    });
    expect(setByKey({ a: { b: { c: 1 } } }, 'a.b.c.d', 2)).toEqual({
      a: { b: { c: { d: 2 } } },
    });
    expect(setByKey({ a: { b: { c: 1 } } }, 'a.b.c.d', 2, false)).toEqual({
      a: { b: { c: 1 } },
    });
  });

  test('NOOP', async () => {
    expect(NOOP()).toBeUndefined();
  });

  test('isPlainObject', async () => {
    expect(isPlainObject({})).toBeTruthy();
    expect(isPlainObject({ a: 1 })).toBeTruthy();
    expect(isPlainObject({ a: { b: 1 } })).toBeTruthy();
    // eslint-disable-next-line prefer-object-spread
    expect(isPlainObject(Object.assign({}, { a: 1 }))).toBeTruthy();

    // eslint-disable-next-line prefer-arrow-callback
    expect(isPlainObject(function test1() {})).toBeFalsy();
    expect(isPlainObject(() => {})).toBeFalsy();
    expect(isPlainObject([])).toBeFalsy();

    expect(isPlainObject(null)).toBeFalsy();
    expect(isPlainObject(undefined)).toBeFalsy();
    expect(isPlainObject('')).toBeFalsy();
    expect(isPlainObject('1')).toBeFalsy();
    expect(isPlainObject(0)).toBeFalsy();
    expect(isPlainObject(1)).toBeFalsy();
    expect(isPlainObject(BigInt(0))).toBeFalsy();
    expect(isPlainObject(BigInt(1))).toBeFalsy();
    expect(isPlainObject(false)).toBeFalsy();
    expect(isPlainObject(true)).toBeFalsy();
    expect(isPlainObject(Symbol(''))).toBeFalsy();
  });
});
