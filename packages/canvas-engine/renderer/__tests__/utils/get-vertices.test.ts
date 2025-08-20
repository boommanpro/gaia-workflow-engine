/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { calcEllipseY, getHorizontalVertices, getVertices } from '../../src/components/utils';
import {
  mockDivergeLine1,
  mockDivergeLine2,
  mockDivergeLine3,
  mockMergeLine3,
  mockMergeLine4,
  mockMergeLine5,
  noRadiusLine,
  noTypeLine,
} from '../../__mocks__/mock-lines';

describe('test Vertices', () => {
  it('calcEllipseY', () => {
    expect(calcEllipseY(1, 1, 3)).toEqual(0);
  });
  // 垂直布局
  it('getVertices diverge_line', () => {
    expect(() => getVertices(undefined as any)).toThrowError();
    // 正常线条
    const res1 = getVertices(mockDivergeLine1);
    expect(res1).toEqual([
      { x: 140, y: 215, radiusY: 3 },
      { x: 0, y: 215 },
    ]);
    // radiusYCount = 1
    const res2 = getVertices(mockDivergeLine2);
    expect(res2).toEqual([{ x: 156, y: 212, radiusY: 20 }]);
    // radiusYCount > 1 & radiusXCount < 1
    const res3 = getVertices(mockDivergeLine3);
    expect(res3).toEqual([
      { x: 140, y: 232, moveX: 0.5 },
      { x: 141, y: 232, moveX: 0.5 },
    ]);
  });
  it('getVertices merge_line', () => {
    // merge_line radiusYCount < 2
    const res3 = getVertices(mockMergeLine3);
    expect(res3).toEqual([{ x: 140, y: 235 }]);
    // merge_line radiusYCount > 2 & radiusXCount < 2
    const res4 = getVertices(mockMergeLine4);
    expect(res4).toEqual([
      { x: 140, y: 315, moveX: 0.5 },
      { x: 141, y: 315, moveX: 0.5 },
    ]);
    // merge_line radiusYCount > 2 & radiusXCount > 2
    const res5 = getVertices(mockMergeLine5);
    expect(res5).toEqual([
      { x: 140, y: 315, moveX: 5 },
      { x: 150, y: 315, moveX: 5 },
    ]);
  });

  it('getVertices no radius line', () => {
    const noRadiusRes = getVertices(noRadiusLine);
    expect(noRadiusRes).toEqual([]);
    const noTypeRes = getVertices(noTypeLine as any);
    expect(noTypeRes).toEqual([]);
  });

  // 水平布局
  it('getHorizontalVertices diverge_line', () => {
    expect(() => getHorizontalVertices(undefined as any)).toThrowError();
    // 正常线条
    const res1 = getHorizontalVertices(mockDivergeLine1);
    expect(res1).toEqual([
      { x: 160, y: 212, moveY: 11.5 },
      { x: 160, y: 235, moveY: 11.5 },
    ]);
    // radiusYCount = 1
    const res2 = getHorizontalVertices(mockDivergeLine2);
    expect(res2).toEqual([{ x: 156, y: 212, radiusX: 16 }]);
    // radiusYCount > 1 & radiusXCount < 2
    const res3 = getHorizontalVertices(mockDivergeLine3, 0.9);
    expect(res3).toEqual([
      { x: 121, y: 212, radiusX: -19 },
      { x: 121, y: 332 },
    ]);
  });

  it('getHorizontalVertices merge_line', () => {
    // merge_line radiusYCount < 2
    const res3 = getHorizontalVertices(mockMergeLine3);
    expect(res3).toEqual([
      { x: -20, y: 212, moveY: 11.5 },
      { x: -20, y: 235, moveY: 11.5 },
    ]);
    // merge_line radiusYCount > 2 & radiusXCount < 2
    const res4 = getHorizontalVertices(mockMergeLine4, 0.9);
    expect(res4).toEqual([{ x: 141, y: 212 }]);
    // merge_line radiusYCount > 2 & radiusXCount > 2
    const res5 = getHorizontalVertices(mockMergeLine5);
    expect(res5).toEqual([]);
  });

  it('getHorizontalVertices no radius line', () => {
    const noRadiusRes = getHorizontalVertices(noRadiusLine);
    expect(noRadiusRes).toEqual([]);
    const noTypeRes = getHorizontalVertices(noTypeLine as any);
    expect(noTypeRes).toEqual([]);
  });
});
