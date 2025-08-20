/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// nolint: cyclo_complexity,method_line
import { describe, test, expect, it } from 'vitest';

import { Transform } from './Transform';
import { Matrix as M, Matrix } from './Matrix';
import { PI } from './const';

describe('Matrix', () => {
  test('Matrix', async () => {
    expect(new M()).toEqual(M.IDENTITY);
    expect(new M()).toEqual(M.TEMP_MATRIX);
  });

  test('fromArray', async () => {
    expect(new M().fromArray([])).toEqual(M.IDENTITY);
    expect(new M().fromArray([1, 2, 3])).toEqual(M.IDENTITY);
    expect(new M().fromArray([0, 1, 2, 3, 4, 5])).toEqual(new M(0, 1, 3, 4, 2, 5));
    expect(new M().fromArray([0, 1, 2, 3, 4, 5, 6])).toEqual(new M(0, 1, 3, 4, 2, 5));
  });

  test('set', async () => {
    expect(new M().set(0, 1, 2, 3, 4, 5)).toEqual(new M(0, 1, 2, 3, 4, 5));
  });

  test('toArray', async () => {
    expect(new M(0, 1, 2, 3, 4, 5).toArray(true)).toEqual(
      Float32Array.from([0, 1, 0, 2, 3, 0, 4, 5, 1]),
    );
    expect(new M(0, 1, 2, 3, 4, 5).toArray(false)).toEqual(
      Float32Array.from([0, 2, 4, 1, 3, 5, 0, 0, 1]),
    );

    const arr = new Float32Array(9);
    new M(0, 1, 2, 3, 4, 5).toArray(false, arr);
    expect(arr).toEqual(Float32Array.from([0, 2, 4, 1, 3, 5, 0, 0, 1]));
  });

  test('apply', async () => {
    expect(M.IDENTITY.apply({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
    // translate only
    expect(new M(1, 0, 0, 1, 1, 1).apply({ x: 1, y: 2 })).toEqual({
      x: 2,
      y: 3,
    });
    // scale only
    expect(new M(2, 0, 0, 2).apply({ x: 1, y: 2 })).toEqual({ x: 2, y: 4 });
    // skew only
    expect(new M(1, 1, 1, 1).apply({ x: 1, y: 2 })).toEqual({ x: 3, y: 3 });
    expect(new M(1, 1, -1, 1).apply({ x: 1, y: 2 })).toEqual({ x: -1, y: 3 });
  });

  test('applyInverse', async () => {
    expect(M.IDENTITY.applyInverse({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
    // translate only
    expect(new M(1, 0, 0, 1, 1, 1).applyInverse({ x: 1, y: 2 })).toEqual({
      x: 0,
      y: 1,
    });
    // scale only
    expect(new M(2, 0, 0, 2).applyInverse({ x: 1, y: 2 })).toEqual({
      x: 0.5,
      y: 1,
    });
    // skew only
    expect(new M(1, 1, -1, 1).applyInverse({ x: 1, y: 2 })).toEqual({
      x: 1.5,
      y: 0.5,
    });
  });

  test('translate', async () => {
    expect(M.IDENTITY.translate(1, -2).apply({ x: 0, y: 0 })).toEqual({
      x: 1,
      y: -2,
    });
  });

  test('scale', async () => {
    expect(M.IDENTITY.scale(1, -2).apply({ x: 1, y: 2 })).toEqual({
      x: 1,
      y: -4,
    });
    expect(M.IDENTITY.scale(0, 0).apply({ x: 1, y: 2 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('rotate', async () => {
    const r1 = M.IDENTITY.rotate(PI / 2).apply({ x: 1, y: 2 });
    expect(r1.x).toBeCloseTo(-2);
    expect(r1.y).toBeCloseTo(1);
    expect(M.IDENTITY.rotate(PI / 2).apply({ x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  test('append', async () => {
    expect(M.IDENTITY.append(M.IDENTITY)).toEqual(M.IDENTITY);
    expect(M.IDENTITY.append(new M(0, 1, 2, 3, 4, 5))).toEqual(new M(0, 1, 2, 3, 4, 5));
    expect(new M(0, 1, 2, 3, 4, 5).append(M.IDENTITY)).toEqual(new M(0, 1, 2, 3, 4, 5));
    expect(new M(0, 1, 2, 3, 4, 5).append(new M(0, 1, 2, 3, 4, 5))).toEqual(
      new M(2, 3, 6, 11, 14, 24),
    );
  });

  test('prepend', async () => {
    expect(M.IDENTITY.prepend(M.IDENTITY)).toEqual(M.IDENTITY);
    expect(M.IDENTITY.prepend(new M(0, 1, 2, 3, 4, 5))).toEqual(new M(0, 1, 2, 3, 4, 5));
    expect(new M(0, 1, 2, 3, 4, 5).prepend(M.IDENTITY)).toEqual(new M(0, 1, 2, 3, 4, 5));
    expect(new M(0, 1, 2, 3, 4, 5).prepend(new M(0, 1, 2, 3, 1, 2))).toEqual(
      new M(2, 3, 6, 11, 11, 21),
    );
  });

  test('identity', async () => {
    expect(new M(0, 1, 2, 3, 4, 5).identity()).toEqual(M.IDENTITY);
  });

  test('invert', async () => {
    expect(new M(0, 1, 2, 3, 4, 5).invert()).toEqual(new M(-1.5, 0.5, 1, -0, 1, -2));
    expect(new M(-1.5, 0.5, 1, -0, 1, -2).invert()).toEqual(new M(0, 1, 2, 3, 4, 5));
    // expect(M.IDENTITY.invert()).toEqual(M.IDENTITY)
  });

  test('copyTo', async () => {
    expect(new M(0, 1, 2, 3, 4, 5).copyTo(M.TEMP_MATRIX)).toEqual(new M(0, 1, 2, 3, 4, 5));
  });

  test('copyFrom', async () => {
    expect(M.TEMP_MATRIX.copyFrom(new M(0, 1, 2, 3, 4, 5))).toEqual(new M(0, 1, 2, 3, 4, 5));
  });

  test('isSimple', async () => {
    expect(new M(1, 0, 0, 1, 0, 0).isSimple()).toBeTruthy();
    expect(new M(0, 1, 2, 3, 4, 5).isSimple()).toBeFalsy();
  });

  /**
   * @see https://github.com/pixijs/pixijs/blob/dev/packages/math/test/Matrix.tests.ts
   */
  it('should create a new matrix', () => {
    const matrix = new Matrix();

    expect(matrix.a).toEqual(1);
    expect(matrix.b).toEqual(0);
    expect(matrix.c).toEqual(0);
    expect(matrix.d).toEqual(1);
    expect(matrix.tx).toEqual(0);
    expect(matrix.ty).toEqual(0);

    const input = [0, 1, 2, 3, 4, 5];

    matrix.fromArray(input);

    expect(matrix.a).toEqual(0);
    expect(matrix.b).toEqual(1);
    expect(matrix.c).toEqual(3);
    expect(matrix.d).toEqual(4);
    expect(matrix.tx).toEqual(2);
    expect(matrix.ty).toEqual(5);

    let output = matrix.toArray(true);

    expect(output.length).toEqual(9);
    expect(output[0]).toEqual(0);
    expect(output[1]).toEqual(1);
    expect(output[3]).toEqual(3);
    expect(output[4]).toEqual(4);
    expect(output[6]).toEqual(2);
    expect(output[7]).toEqual(5);

    output = matrix.toArray(false);

    expect(output.length).toEqual(9);
    expect(output[0]).toEqual(0);
    expect(output[1]).toEqual(3);
    expect(output[2]).toEqual(2);
    expect(output[3]).toEqual(1);
    expect(output[4]).toEqual(4);
    expect(output[5]).toEqual(5);
  });

  it('should apply different transforms', () => {
    const matrix = new Matrix();

    matrix.translate(10, 20);
    matrix.translate(1, 2);
    expect(matrix.tx).toEqual(11);
    expect(matrix.ty).toEqual(22);

    matrix.scale(2, 4);
    expect(matrix.a).toEqual(2);
    expect(matrix.b).toEqual(0);
    expect(matrix.c).toEqual(0);
    expect(matrix.d).toEqual(4);
    expect(matrix.tx).toEqual(22);
    expect(matrix.ty).toEqual(88);

    const m2 = matrix.clone();

    expect(m2).not.toBe(matrix);
    expect(m2.a).toEqual(2);
    expect(m2.b).toEqual(0);
    expect(m2.c).toEqual(0);
    expect(m2.d).toEqual(4);
    expect(m2.tx).toEqual(22);
    expect(m2.ty).toEqual(88);

    matrix.setTransform(14, 15, 0, 0, 4, 2, 0, 0, 0);
    expect(matrix.a).toEqual(4);
    expect(matrix.b).toEqual(0);
    // Object.is cant distinguish between 0 and -0
    expect(Math.abs(matrix.c)).toEqual(0);
    expect(matrix.d).toEqual(2);
    expect(matrix.tx).toEqual(14);
    expect(matrix.ty).toEqual(15);
  });

  it('should allow rotatation', () => {
    const matrix = new Matrix();

    matrix.rotate(Math.PI);

    expect(matrix.a).toEqual(-1);
    expect(matrix.b).toEqual(Math.sin(Math.PI));
    expect(matrix.c).toEqual(-Math.sin(Math.PI));
    expect(matrix.d).toEqual(-1);
  });

  it('should append matrix', () => {
    const m1 = new Matrix();
    const m2 = new Matrix();

    m2.tx = 100;
    m2.ty = 200;

    m1.append(m2);

    expect(m1.tx).toEqual(m2.tx);
    expect(m1.ty).toEqual(m2.ty);
  });

  it('should prepend matrix', () => {
    const m1 = new Matrix();
    const m2 = new Matrix();

    m2.set(2, 3, 4, 5, 100, 200);
    m1.prepend(m2);

    expect(m1.a).toEqual(m2.a);
    expect(m1.b).toEqual(m2.b);
    expect(m1.c).toEqual(m2.c);
    expect(m1.d).toEqual(m2.d);
    expect(m1.tx).toEqual(m2.tx);
    expect(m1.ty).toEqual(m2.ty);

    const m3 = new Matrix();
    const m4 = new Matrix();

    m3.prepend(m4);

    expect(m3.a).toEqual(m4.a);
    expect(m3.b).toEqual(m4.b);
    expect(m3.c).toEqual(m4.c);
    expect(m3.d).toEqual(m4.d);
    expect(m3.tx).toEqual(m4.tx);
    expect(m3.ty).toEqual(m4.ty);
  });

  it('should get IDENTITY and TEMP_MATRIX', () => {
    expect(Matrix.IDENTITY instanceof Matrix).toBe(true);
    expect(Matrix.TEMP_MATRIX instanceof Matrix).toBe(true);
  });

  it('should reset matrix to default when identity() is called', () => {
    const matrix = new Matrix();

    matrix.set(2, 3, 4, 5, 100, 200);

    expect(matrix.a).toEqual(2);
    expect(matrix.b).toEqual(3);
    expect(matrix.c).toEqual(4);
    expect(matrix.d).toEqual(5);
    expect(matrix.tx).toEqual(100);
    expect(matrix.ty).toEqual(200);

    matrix.identity();

    expect(matrix.a).toEqual(1);
    expect(matrix.b).toEqual(0);
    expect(matrix.c).toEqual(0);
    expect(matrix.d).toEqual(1);
    expect(matrix.tx).toEqual(0);
    expect(matrix.ty).toEqual(0);
  });

  it('should have the same transform after decompose', () => {
    const matrix = new Matrix();
    const transformInitial = new Transform();
    const transformDecomposed = new Transform();

    for (let x = 0; x < 50; ++x) {
      transformInitial.position.x = Math.random() * 1000 - 2000;
      transformInitial.position.y = Math.random() * 1000 - 2000;
      transformInitial.scale.x = Math.random() * 5 - 10;
      transformInitial.scale.y = Math.random() * 5 - 10;
      transformInitial.rotation = (Math.random() - 2) * Math.PI;
      transformInitial.skew.x = (Math.random() - 2) * Math.PI;
      transformInitial.skew.y = (Math.random() - 2) * Math.PI;

      matrix.setTransform(
        transformInitial.position.x,
        transformInitial.position.y,
        0,
        0,
        transformInitial.scale.x,
        transformInitial.scale.y,
        transformInitial.rotation,
        transformInitial.skew.x,
        transformInitial.skew.y,
      );
      matrix.decompose(transformDecomposed);

      transformInitial.updateLocalTransform();
      transformDecomposed.updateLocalTransform();

      expect(transformInitial.localTransform.a).toBeCloseTo(
        transformDecomposed.localTransform.a,
        0.0001,
      );
      expect(transformInitial.localTransform.b).toBeCloseTo(
        transformDecomposed.localTransform.b,
        0.0001,
      );
      expect(transformInitial.localTransform.c).toBeCloseTo(
        transformDecomposed.localTransform.c,
        0.0001,
      );
      expect(transformInitial.localTransform.d).toBeCloseTo(
        transformDecomposed.localTransform.d,
        0.0001,
      );
      expect(transformInitial.localTransform.tx).toBeCloseTo(
        transformDecomposed.localTransform.tx,
        0.0001,
      );
      expect(transformInitial.localTransform.ty).toBeCloseTo(
        transformDecomposed.localTransform.ty,
        0.0001,
      );
    }
  });

  it('should decompose corner case', () => {
    const matrix = new Matrix();
    const transform = new Transform();
    const result = transform.localTransform;

    matrix.a = -0.00001;
    matrix.b = -1;
    matrix.c = 1;
    matrix.d = 0;
    matrix.decompose(transform);
    transform.updateLocalTransform();

    expect(result.a).toBeCloseTo(matrix.a, 0.001);
    expect(result.b).toBeCloseTo(matrix.b, 0.001);
    expect(result.c).toBeCloseTo(matrix.c, 0.001);
    expect(result.d).toBeCloseTo(matrix.d, 0.001);
  });

  describe('decompose', () => {
    it('should be the inverse of updateLocalTransform even when pivot is set', () => {
      const matrix = new Matrix(0.01, 0.04, 0.04, 0.1, 2, 2);
      const transform = new Transform();

      transform.pivot.set(40, 40);

      matrix.decompose(transform);
      transform.updateLocalTransform();

      const { localTransform } = transform;

      expect(localTransform.a).toBeCloseTo(matrix.a, 0.001);
      expect(localTransform.b).toBeCloseTo(matrix.b, 0.001);
      expect(localTransform.c).toBeCloseTo(matrix.c, 0.001);
      expect(localTransform.d).toBeCloseTo(matrix.d, 0.001);
      // FIXME expect(localTransform.tx).toBeCloseTo(matrix.tx, 0.001)
      // FIXME expect(localTransform.ty).toBeCloseTo(matrix.ty, 0.001)
    });
  });
});
