/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable prefer-destructuring */
import type { Transform } from './Transform';
import type { IPoint } from './IPoint';
import { PI_2 } from './const';

/**
 * The PIXIJS Matrix as a class makes it a lot faster.
 *
 * Here is a representation of it:
 * ```js
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 * // default:
 * | 1 | 0 | 0 |
 * | 0 | 1 | 0 |
 * | 0 | 0 | 1 |
 * ```
 */
export class Matrix {
  public array: Float32Array | null = null;

  /**
   * @param [a] x scale
   * @param [b] x skew
   * @param [c] y skew
   * @param [d] y scale
   * @param [tx] x translation
   * @param [ty] y translation
   */
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public tx = 0,
    public ty = 0,
  ) {}

  /**
   * A default (identity) matrix
   */
  static get IDENTITY(): Matrix {
    return new Matrix();
  }

  /**
   * A temp matrix
   */
  static get TEMP_MATRIX(): Matrix {
    return new Matrix();
  }

  /**
   * Creates a Matrix object based on the given array. The Element to Matrix mapping order is as follows:
   *
   * @param array The array that the matrix will be populated from.
   */
  fromArray(array: number[]): this {
    if (array.length < 6) return this;

    this.a = array[0];
    this.b = array[1];
    this.c = array[3];
    this.d = array[4];
    this.tx = array[2];
    this.ty = array[5];
    return this;
  }

  /**
   * sets the matrix properties
   *
   * @param a Matrix component
   * @param b Matrix component
   * @param c Matrix component
   * @param d Matrix component
   * @param tx Matrix component
   * @param ty Matrix component
   */
  set(a: number, b: number, c: number, d: number, tx: number, ty: number): this {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;

    return this;
  }

  /**
   * Creates an array from the current Matrix object.
   *
   * @param transpose Whether we need to transpose the matrix or not
   * @param [out=new Float32Array(9)] If provided the array will be assigned to out
   * @return the newly created array which contains the matrix
   */
  toArray(transpose: boolean, out?: Float32Array): Float32Array {
    if (!this.array) {
      this.array = new Float32Array(9);
    }

    const array = out || this.array;

    if (transpose) {
      array[0] = this.a;
      array[1] = this.b;
      array[2] = 0;
      array[3] = this.c;
      array[4] = this.d;
      array[5] = 0;
      array[6] = this.tx;
      array[7] = this.ty;
      array[8] = 1;
    } else {
      array[0] = this.a;
      array[1] = this.c;
      array[2] = this.tx;
      array[3] = this.b;
      array[4] = this.d;
      array[5] = this.ty;
      array[6] = 0;
      array[7] = 0;
      array[8] = 1;
    }

    return array;
  }

  /**
   * Get a new position with the current transformation applied.
   * Can be used to go from a child's coordinate space to the world coordinate space. (e.g. rendering)
   *
   * @param pos The origin
   * @param [newPos] The point that the new position is assigned to (allowed to be same as input)
   * @return The new point, transformed through this matrix
   */
  apply(pos: IPoint, newPos?: IPoint): IPoint {
    newPos = newPos || { x: 0, y: 0 };

    const { x, y } = pos;

    newPos.x = this.a * x + this.c * y + this.tx;
    newPos.y = this.b * x + this.d * y + this.ty;

    return newPos;
  }

  /**
   * Get a new position with the inverse of the current transformation applied.
   * Can be used to go from the world coordinate space to a child's coordinate space. (e.g. input)
   *
   * @param pos The origin
   * @param [newPos] The point that the new position is assigned to (allowed to be same as input)
   * @return The new point, inverse-transformed through this matrix
   */
  applyInverse(pos: IPoint, newPos?: IPoint): IPoint {
    newPos = newPos || { x: 0, y: 0 };

    const id = 1 / (this.a * this.d + this.c * -this.b);

    const { x } = pos;
    const { y } = pos;

    newPos.x = this.d * id * x + -this.c * id * y + (this.ty * this.c - this.tx * this.d) * id;
    newPos.y = this.a * id * y + -this.b * id * x + (-this.ty * this.a + this.tx * this.b) * id;

    return newPos;
  }

  /**
   * Translates the matrix on the x and y.
   *
   * @param x How much to translate x by
   * @param y How much to translate y by
   */
  translate(x: number, y: number): this {
    this.tx += x;
    this.ty += y;

    return this;
  }

  /**
   * Applies a scale transformation to the matrix.
   *
   * @param x The amount to scale horizontally
   * @param y The amount to scale vertically
   */
  scale(x: number, y: number): this {
    this.a *= x;
    this.d *= y;
    this.c *= x;
    this.b *= y;
    this.tx *= x;
    this.ty *= y;

    return this;
  }

  /**
   * Applies a rotation transformation to the matrix.
   *
   * @param angle The angle in radians.
   */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const a1 = this.a;
    const c1 = this.c;
    const tx1 = this.tx;

    this.a = a1 * cos - this.b * sin;
    this.b = a1 * sin + this.b * cos;
    this.c = c1 * cos - this.d * sin;
    this.d = c1 * sin + this.d * cos;
    this.tx = tx1 * cos - this.ty * sin;
    this.ty = tx1 * sin + this.ty * cos;

    return this;
  }

  /**
   * 矩阵乘法，当前矩阵 * matrix
   * Appends the given Matrix to this Matrix.
   */
  append(matrix: Matrix): this {
    const a1 = this.a;
    const b1 = this.b;
    const c1 = this.c;
    const d1 = this.d;

    this.a = matrix.a * a1 + matrix.b * c1;
    this.b = matrix.a * b1 + matrix.b * d1;
    this.c = matrix.c * a1 + matrix.d * c1;
    this.d = matrix.c * b1 + matrix.d * d1;

    this.tx = matrix.tx * a1 + matrix.ty * c1 + this.tx;
    this.ty = matrix.tx * b1 + matrix.ty * d1 + this.ty;

    return this;
  }

  /**
   * Sets the matrix based on all the available properties
   *
   * @param x Position on the x axis
   * @param y Position on the y axis
   * @param pivotX Pivot on the x axis
   * @param pivotY Pivot on the y axis
   * @param scaleX Scale on the x axis
   * @param scaleY Scale on the y axis
   * @param rotation Rotation in radians
   * @param skewX Skew on the x axis
   * @param skewY Skew on the y axis
   */
  setTransform(
    x: number,
    y: number,
    pivotX: number,
    pivotY: number,
    scaleX: number,
    scaleY: number,
    rotation: number,
    skewX: number,
    skewY: number,
  ): this {
    this.a = Math.cos(rotation + skewY) * scaleX;
    this.b = Math.sin(rotation + skewY) * scaleX;
    this.c = -Math.sin(rotation - skewX) * scaleY;
    this.d = Math.cos(rotation - skewX) * scaleY;

    this.tx = x - (pivotX * this.a + pivotY * this.c);
    this.ty = y - (pivotX * this.b + pivotY * this.d);

    return this;
  }

  /**
   * 矩阵乘法，matrix * 当前矩阵
   * Prepends the given Matrix to this Matrix.
   */
  prepend(matrix: Matrix): this {
    const tx1 = this.tx;

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
      const a1 = this.a;
      const c1 = this.c;

      this.a = a1 * matrix.a + this.b * matrix.c;
      this.b = a1 * matrix.b + this.b * matrix.d;
      this.c = c1 * matrix.a + this.d * matrix.c;
      this.d = c1 * matrix.b + this.d * matrix.d;
    }

    this.tx = tx1 * matrix.a + this.ty * matrix.c + matrix.tx;
    this.ty = tx1 * matrix.b + this.ty * matrix.d + matrix.ty;

    return this;
  }

  /**
   * Decomposes the matrix (x, y, scaleX, scaleY, and rotation) and sets the properties on to a transform.
   *
   * @param transform The transform to apply the properties to.
   * @return The transform with the newly applied properties
   */
  decompose(transform: Transform): Transform {
    // sort out rotation / skew..
    const { a } = this;
    const { b } = this;
    const { c } = this;
    const { d } = this;

    const skewX = -Math.atan2(-c, d);
    const skewY = Math.atan2(b, a);

    const delta = Math.abs(skewX + skewY);

    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001) {
      transform.rotation = skewY;
      transform.skew.x = 0;
      transform.skew.y = 0;
    } else {
      transform.rotation = 0;
      transform.skew.x = skewX;
      transform.skew.y = skewY;
    }

    // next set scale
    transform.scale.x = Math.sqrt(a * a + b * b);
    transform.scale.y = Math.sqrt(c * c + d * d);

    // next set position
    transform.position.x = this.tx;
    transform.position.y = this.ty;

    return transform;
  }

  /**
   * Inverts this matrix
   */
  invert(): this {
    const a1 = this.a;
    const b1 = this.b;
    const c1 = this.c;
    const d1 = this.d;
    const tx1 = this.tx;
    const n = a1 * d1 - b1 * c1;

    this.a = d1 / n;
    this.b = -b1 / n;
    this.c = -c1 / n;
    this.d = a1 / n;
    this.tx = (c1 * this.ty - d1 * tx1) / n;
    this.ty = -(a1 * this.ty - b1 * tx1) / n;

    return this;
  }

  /**
   * Resets this Matrix to an identity (default) matrix.
   */
  identity(): this {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;

    return this;
  }

  /**
   * 未做旋转的矩阵
   */
  isSimple(): boolean {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1;
  }

  /**
   * Creates a new Matrix object with the same values as this one.
   *
   * @return A copy of this matrix.
   */
  clone(): Matrix {
    const matrix = new Matrix();

    matrix.a = this.a;
    matrix.b = this.b;
    matrix.c = this.c;
    matrix.d = this.d;
    matrix.tx = this.tx;
    matrix.ty = this.ty;

    return matrix;
  }

  /**
   * Changes the values of the given matrix to be the same as the ones in this matrix
   *
   * @return The matrix given in parameter with its values updated.
   */
  copyTo(matrix: Matrix): Matrix {
    matrix.a = this.a;
    matrix.b = this.b;
    matrix.c = this.c;
    matrix.d = this.d;
    matrix.tx = this.tx;
    matrix.ty = this.ty;

    return matrix;
  }

  /**
   * Changes the values of the matrix to be the same as the ones in given matrix
   */
  copyFrom(matrix: Matrix): this {
    this.a = matrix.a;
    this.b = matrix.b;
    this.c = matrix.c;
    this.d = matrix.d;
    this.tx = matrix.tx;
    this.ty = matrix.ty;

    return this;
  }
}
