/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { wrap } from './wrap';

describe('wrap', () => {
  test('wrap', async () => {
    expect(wrap(-1, 1, 10)).toBe(8);
    expect(wrap(0, 1, 10)).toBe(9);
    expect(wrap(1, 1, 10)).toBe(1);
    expect(wrap(2, 1, 10)).toBe(2);
    expect(wrap(3, 1, 10)).toBe(3);
    expect(wrap(4, 1, 10)).toBe(4);
    expect(wrap(5, 1, 10)).toBe(5);
    expect(wrap(6, 1, 10)).toBe(6);
    expect(wrap(7, 1, 10)).toBe(7);
    expect(wrap(8, 1, 10)).toBe(8);
    expect(wrap(9, 1, 10)).toBe(9);
    expect(wrap(10, 1, 10)).toBe(1);
    expect(wrap(11, 1, 10)).toBe(2);
  });
});
