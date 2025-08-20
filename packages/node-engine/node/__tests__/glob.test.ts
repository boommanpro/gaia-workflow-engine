/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// test src/glob.ts
import { describe, expect, it } from 'vitest';
import { Glob } from '@flowgram.ai/form';

describe('glob', () => {
  it('return original path array if no *', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(Glob.findMatchPaths(obj, 'a.b.c')).toEqual(['a.b.c']);
  });
  it('object: when * is in middle of the path', () => {
    const obj = {
      a: { b: { c: 1 } },
      x: { y: { z: 2 } },
    };
    expect(Glob.findMatchPaths(obj, 'a.*.c')).toEqual(['a.b.c']);
  });
  it('object:when * is at the end of the path', () => {
    const obj = {
      a: { b: { c: 1 } },
      x: { y: { z: 2 } },
    };
    expect(Glob.findMatchPaths(obj, 'a.*')).toEqual(['a.b']);
  });
  it('object:when * is at the start of the path', () => {
    const obj = {
      a: { b: { c: 1 } },
      x: { y: { z: 2 } },
    };
    expect(Glob.findMatchPaths(obj, '*.y')).toEqual(['x.y']);
  });
  it('array: when * is at the end of the path', () => {
    const obj = {
      other: 100,
      arr: [
        {
          x: 1,
          y: { a: 1, b: 2 },
        },
        {
          x: 10,
          y: {
            a: 10,
            b: 20,
          },
        },
      ],
    };
    expect(Glob.findMatchPaths(obj, 'arr.*')).toEqual(['arr.0', 'arr.1']);
  });
  it('array: when * is at the start of the path', () => {
    const arr = [
      {
        x: 1,
        y: { a: 1, b: 2 },
      },
      {
        x: 10,
        y: {
          a: 10,
          b: 20,
        },
      },
    ];

    expect(Glob.findMatchPaths(arr, '*')).toEqual(['0', '1']);
  });
  it('array: when * is in the middle of the path', () => {
    const obj = {
      other: 100,
      arr: [
        {
          x: 1,
          y: { a: 1, b: 2 },
        },
        {
          x: 10,
          y: {
            a: 10,
            b: 20,
          },
        },
      ],
    };

    expect(Glob.findMatchPaths(obj, 'arr.*.y')).toEqual(['arr.0.y', 'arr.1.y']);
  });
});
