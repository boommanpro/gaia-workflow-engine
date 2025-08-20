/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { PI } from './const';
import { Angle } from './angle';

describe('Angle', () => {
  test('wrap', async () => {
    expect(Angle.wrap(-PI * 2)).toEqual(0);
    expect(Angle.wrap(-PI)).toEqual(-PI);
    expect(Angle.wrap(0)).toEqual(0);
    expect(Angle.wrap(PI / 2)).toEqual(PI / 2);
    expect(Angle.wrap(PI)).toEqual(-PI);
    expect(Angle.wrap(PI * 2)).toEqual(0);
  });

  test('wrapDegrees', async () => {
    expect(Angle.wrapDegrees(-180 * 2)).toEqual(0);
    expect(Angle.wrapDegrees(-180)).toEqual(-180);
    expect(Angle.wrapDegrees(0)).toEqual(0);
    expect(Angle.wrapDegrees(180 / 2)).toEqual(180 / 2);
    expect(Angle.wrapDegrees(180)).toEqual(-180);
    expect(Angle.wrapDegrees(180 * 2)).toEqual(0);
  });

  test('betweenPoints', async () => {
    expect(Angle.betweenPoints({ x: 1, y: 1 }, { x: 2, y: 2 })).toEqual(0);
    expect(Angle.betweenPoints({ x: 1, y: 0 }, { x: 0, y: 1 })).toEqual(PI / 2);
    expect(Angle.betweenPoints({ x: 0, y: 1 }, { x: 1, y: 0 })).toEqual(-PI / 2);
    expect(Angle.betweenPoints({ x: -1, y: 0 }, { x: 1, y: 0 })).toEqual(-PI);
    expect(Angle.betweenPoints({ x: 1, y: 0 }, { x: -1, y: 0 })).toEqual(PI);
  });
});
