/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { generateLocalId, _setIdx } from './id';

describe('id', () => {
  test('generateLocalId', async () => {
    expect(generateLocalId()).toBe(0);
    expect(generateLocalId()).toBe(1);
    expect(generateLocalId()).toBe(2);
    expect(generateLocalId()).toBeGreaterThan(2);
  });

  test('_setIdx', async () => {
    _setIdx(Number.MAX_SAFE_INTEGER - 1);
    expect(generateLocalId()).toBe(Number.MAX_SAFE_INTEGER - 1);
    expect(generateLocalId()).toBe(0);
  });
});
