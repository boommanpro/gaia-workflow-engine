/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { LinePoint } from '@flowgram.ai/free-layout-core';

import { getBezierControlPoints } from '../contributions/bezier/bezier-controls';

describe('bezier-controls', () => {
  it('getBezierControlPoints', () => {
    const fromPos: LinePoint = {
      x: 325,
      y: 41.5,
      location: 'bottom',
    };
    const toPos: LinePoint = {
      x: 225,
      y: 97,
      location: 'top',
    };
    expect(getBezierControlPoints(fromPos, toPos)).toMatchSnapshot();
  });
});
