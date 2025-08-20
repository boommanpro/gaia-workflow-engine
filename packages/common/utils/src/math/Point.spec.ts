/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { Point } from './Point';

describe('Point', () => {
  test('Point', async () => {
    expect(Point).not.toBeUndefined();
    expect(new Point()).toEqual({ x: 0, y: 0 });
    expect(new Point(1, 2)).toEqual({ x: 1, y: 2 });
  });

  test('Point/clone', async () => {
    const p1 = new Point(1, 2);
    const p2 = p1.clone();
    p2.y = 3;
    expect(p1).toEqual({ x: 1, y: 2 });
    expect(p2).toEqual({ x: 1, y: 3 });
  });

  test('Point/copyFrom', async () => {
    expect(new Point().copyFrom({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });

  test('Point/copyTo', async () => {
    expect(new Point(1, 2).copyTo({ x: 0, y: 0 })).toEqual({ x: 1, y: 2 });
  });

  test('Point/equals', async () => {
    expect(new Point(1, 2).equals({ x: 1, y: 2 })).toBeTruthy();
    expect(new Point().equals({ x: 0, y: 0 })).toBeTruthy();
    expect(new Point(1, 2).equals({ x: 0, y: 0 })).toBeFalsy();
  });

  test('Point/set', async () => {
    expect(new Point(1, 2).set()).toEqual({ x: 0, y: 0 });
    expect(new Point(1, 2).set(2, 1)).toEqual({ x: 2, y: 1 });
  });

  test('getDistance', async () => {
    expect(Point.getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toEqual(5);
    expect(Point.getDistance({ x: 0, y: 0 }, { x: -3, y: -4 })).toEqual(5);
    expect(Point.getDistance({ x: 0, y: 0 }, { x: 1, y: 1 })).toEqual(Math.sqrt(2));
  });

  test('getMiddlePoint', async () => {
    expect(Point.getMiddlePoint({ x: 0, y: 0 }, { x: 3, y: 4 })).toEqual({
      x: 1.5,
      y: 2,
    });
    expect(Point.getMiddlePoint({ x: 0, y: 0 }, { x: -3, y: -4 })).toEqual({
      x: -1.5,
      y: -2,
    });
  });

  test('moveDistanceToDirection', async () => {
    expect(Point.moveDistanceToDirection({ x: 0, y: 0 }, { x: 3, y: 4 }, 2.5)).toEqual({
      x: 1.5,
      y: 2,
    });
    expect(Point.moveDistanceToDirection({ x: 0, y: 0 }, { x: 0, y: 4 }, 2)).toEqual({
      x: 0,
      y: 2,
    });
    expect(Point.moveDistanceToDirection({ x: 0, y: 0 }, { x: 0, y: -4 }, 2)).toEqual({
      x: 0,
      y: -2,
    });
  });

  test('fixZero', async () => {
    expect(Point.fixZero({ x: -0, y: -0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('move', async () => {
    expect(Point.move({ x: 1, y: 2 }, { x: 1, y: 1 })).toEqual({
      x: 2,
      y: 3,
    });
    expect(Point.move({ x: 1, y: 2 }, {})).toEqual({
      x: 1,
      y: 2,
    });
    expect(Point.move({ x: 1, y: 2 }, { x: 1 })).toEqual({
      x: 2,
      y: 2,
    });
    expect(Point.move({ x: 1, y: 2 }, { y: 1 })).toEqual({
      x: 1,
      y: 3,
    });
  });
});
