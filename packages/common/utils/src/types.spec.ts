/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { isNumber, isFunction, isString, getTag } from './types';

describe('types', () => {
  test('isNumber', () => {
    expect(isNumber(undefined)).toBeFalsy();
    expect(isNumber(123)).toBeTruthy();
    expect(isNumber(Number(123))).toBeTruthy();
    expect(isNumber('123')).toBeFalsy();
  });
  test('isFunction', () => {
    expect(isFunction(undefined)).toBeFalsy();
    expect(isFunction(() => {})).toBeTruthy();
  });
  test('isString', () => {
    expect(isString(undefined)).toBeFalsy();
    expect(isString('')).toBeTruthy();
  });
  test('getTag', () => {
    expect(getTag(undefined)).toEqual('[object Undefined]');
    expect(getTag(null)).toEqual('[object Null]');
    expect(getTag(Number(123))).toEqual('[object Number]');
  });
});
