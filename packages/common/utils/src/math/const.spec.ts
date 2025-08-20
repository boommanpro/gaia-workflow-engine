/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { DEG_TO_RAD, PI, PI_2, RAD_TO_DEG, SHAPES } from './const';

describe('const', () => {
  test('PI_2', async () => {
    expect(PI_2).toEqual(PI * 2);
  });

  test('RAD_TO_DEG', async () => {
    expect((PI / 2) * RAD_TO_DEG).toEqual(90);
    expect(PI * RAD_TO_DEG).toEqual(180);
  });

  test('DEG_TO_RAD', async () => {
    expect(180 * DEG_TO_RAD).toEqual(PI);
    expect(90 * DEG_TO_RAD).toEqual(PI / 2);
  });

  test('SHAPES', async () => {
    expect(SHAPES.RECT).toEqual(1);
    expect(SHAPES.RREC).toEqual(4);
  });
});
