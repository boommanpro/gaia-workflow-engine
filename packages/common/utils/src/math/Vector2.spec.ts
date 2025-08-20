/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { Vector2 } from './Vector2';

describe('Vector2', () => {
  test('Vector2', async () => {
    expect(new Vector2()).toEqual({ x: 0, y: 0 });
    expect(new Vector2(1, 2)).toEqual({ x: 1, y: 2 });
  });

  test('Vector2/sub', async () => {
    expect(new Vector2().sub(new Vector2(1, 2))).toEqual({ x: -1, y: -2 });
    expect(new Vector2(1, 2).sub(new Vector2(1, 2))).toEqual({ x: 0, y: 0 });
  });

  test('Vector2/dot', async () => {
    expect(new Vector2().dot(new Vector2(1, 2))).toEqual(0);
    expect(new Vector2(1, 2).dot(new Vector2(1, 2))).toEqual(5);
  });
});
