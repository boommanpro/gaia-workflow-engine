/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * Wrap the given `value` between `min` and `max`.
 * value ∈ [min, max)
 * e.g.
 *    expect(wrap(0, 1, 10)).toBe(9)
 *    expect(wrap(1, 1, 10)).toBe(1)
 *    expect(wrap(10, 1, 10)).toBe(1)
 *
 * @return The wrapped value.
 */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;

  return min + ((((value - min) % range) + range) % range);
}
