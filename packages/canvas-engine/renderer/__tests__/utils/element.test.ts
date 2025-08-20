/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, expect, it } from 'vitest';

import { isHidden, isRectInit } from '../../src/utils/element';

describe('test isHidden', () => {
  it('isHidden true', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      display: 'none',
    }));
    const mockElement = {
      offsetParent: null,
    };

    const res = isHidden(mockElement as unknown as HTMLElement);
    expect(res).toEqual(true);
  });
  it('isHidden false', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      display: 'block',
    }));
    const mockElement1 = {
      offsetParent: true,
    };

    const res = isHidden(mockElement1 as unknown as HTMLElement);
    expect(res).toEqual(false);
  });
});

describe('isRectInit', () => {
  it('should return false when input is undefined', () => {
    expect(isRectInit(undefined)).toBe(false);
  });

  it('should return false when all properties are 0', () => {
    const emptyRect: DOMRect = {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    expect(isRectInit(emptyRect)).toBe(false);
  });

  it('should return true when any property is not 0', () => {
    const validRect: DOMRect = {
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    expect(isRectInit(validRect)).toBe(true);
  });
});
