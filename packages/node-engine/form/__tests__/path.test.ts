/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { Path } from '../src/core/path';

describe('path', () => {
  it('toString', () => {
    expect(new Path('a.b.c').toString()).toEqual('a.b.c');
    expect(new Path('a.b[0].c').toString()).toEqual('a.b.0.c');
    expect(new Path(['a', 'b', 'c']).toString()).toEqual('a.b.c');
  });
  it('parent', () => {
    expect(new Path('a.b.c').parent!.toString()).toEqual('a.b');
    expect(new Path('a.b[0]').parent!.toString()).toEqual('a.b');
    expect(new Path('a').parent).toEqual(undefined);
  });
  it('isChild', () => {
    expect(new Path('a.b').isChild('a.b.c')).toEqual(true);
    expect(new Path('a.b').isChild('a.b[0]')).toEqual(true);
  });
  it('concat', () => {
    expect(new Path('a').concat('b').toString()).toEqual('a.b');
    expect(new Path('a').concat('b.c').toString()).toEqual('a.b.c');
    expect(new Path('a').concat(0).toString()).toEqual('a.0');
    expect(() => {
      new Path('a').concat({} as any);
    }).toThrowError(/invalid param type/);
  });
  it('compareArrayPath', () => {
    expect((Path.compareArrayPath(new Path('a.b.0'), new Path('a.b.1')) as number) < 0).toBe(true);
    expect((Path.compareArrayPath(new Path('a.b.0'), new Path('a.b.2')) as number) < 0).toBe(true);
    expect((Path.compareArrayPath(new Path('a.b.1'), new Path('a.b.0')) as number) < 0).toBe(false);
    expect((Path.compareArrayPath(new Path('a.b.0'), new Path('a.b.0')) as number) === 0).toBe(
      true
    );
    expect((Path.compareArrayPath(new Path('a.b.1'), new Path('a.b.0.x')) as number) < 0).toBe(
      false
    );
    expect((Path.compareArrayPath(new Path('a.b.1.y'), new Path('a.b.0.x')) as number) < 0).toBe(
      false
    );
    expect(() => Path.compareArrayPath(new Path('a.1'), new Path('a.b.0'))).toThrowError();
    expect(() => Path.compareArrayPath(new Path(''), new Path(''))).toThrowError();
    expect(() => Path.compareArrayPath(new Path('a.b.c'), new Path('a.b'))).toThrowError();
  });
  it('isChildOrGrandChild', () => {
    expect(new Path('a.b').isChildOrGrandChild('a.b.c')).toEqual(true);
    expect(new Path('a.b').isChildOrGrandChild('a.b[0]')).toEqual(true);
    expect(new Path('a.b').isChildOrGrandChild('a.b.1')).toEqual(true);
    expect(new Path('a.b').isChildOrGrandChild('a.b')).toEqual(false);
    expect(new Path('a.b').isChildOrGrandChild('a')).toEqual(false);
    expect(new Path('').isChildOrGrandChild('a')).toEqual(true);
  });

  it('replaceParent', () => {
    expect(new Path('a.b.c.d').replaceParent(new Path('a.b'), new Path('x.y')).toString()).toEqual(
      'x.y.c.d'
    );
    expect(new Path('a.b.0.d').replaceParent(new Path('a.b'), new Path('x.y')).toString()).toEqual(
      'x.y.0.d'
    );
    expect(new Path('0.d').replaceParent(new Path(''), new Path('x.y')).toString()).toEqual(
      'x.y.0.d'
    );
    expect(
      new Path('a.b.c').replaceParent(new Path('a.b.c'), new Path('x.y.z')).toString()
    ).toEqual('x.y.z');
    expect(() =>
      new Path('a.b.0.d').replaceParent(new Path('a1.b'), new Path('x.y')).toString()
    ).toThrowError();

    expect(() =>
      new Path('a.0.d').replaceParent(new Path('a.0.d.e'), new Path('x.y')).toString()
    ).toThrowError();
  });
});
