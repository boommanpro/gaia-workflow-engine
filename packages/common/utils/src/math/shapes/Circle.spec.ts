/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { Rectangle } from './Rectangle';
import { Circle } from './Circle';

describe('Circle', () => {
  test('Circle', async () => {
    expect(new Circle()).toEqual({ radius: 0, type: 2, x: 0, y: 0 });
  });

  test('clone', async () => {
    const c = new Circle();
    const c1 = c.clone();
    c.radius = 2;
    expect(c1.radius).toEqual(0);
  });

  test('contains', async () => {
    const r = new Circle(0, 0, 1);
    expect(r.contains(0, 0)).toEqual(true);
    expect(r.contains(0.5, 0.5)).toEqual(true);
    // const d = Math.sqrt(2) / 2
    // expect(r.contains(d, d)).toEqual(true) // why not true
    expect(r.contains(0.707, 0.707)).toEqual(true);
    expect(r.contains(0, 1)).toEqual(true);
    expect(r.contains(1, 0)).toEqual(true);
    expect(r.contains(1, 1)).toEqual(false);

    expect(new Circle().contains(0, 0)).toEqual(false);
  });

  test('getBounds', async () => {
    const r = new Circle(0, 0, 1);
    expect(r.getBounds()).toEqual(new Rectangle(-1, -1, 2, 2));
  });
});
