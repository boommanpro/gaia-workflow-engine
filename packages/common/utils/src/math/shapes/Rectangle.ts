/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Vector2 } from '../Vector2';
import { Point } from '../Point';
import { type IPoint } from '../IPoint';
import { SHAPES } from '../const';
import { type PaddingSchema } from '../../schema';

/**
 * Size object, contains width and height
 */
export type ISize = { width: number; height: number };

/**
 * Rectangle object is an area defined by its position, as indicated by its top-left corner
 * point (x, y) and by its width and its height.
 */
export class Rectangle {
  /**
   * The type of the object, mainly used to avoid `instanceof` checks
   */
  public readonly type = SHAPES.RECT;

  /**
   * @param [x] - The X coordinate of the upper-left corner of the rectangle
   * @param [y] - The Y coordinate of the upper-left corner of the rectangle
   * @param [width] - The overall width of this rectangle
   * @param [height] - The overall height of this rectangle
   */
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}

  // static _empty: Rectangle = Object.freeze(new Rectangle(0, 0, 0, 0))

  /**
   * A constant empty rectangle. MUST NOT modify properties!
   */
  static get EMPTY(): Rectangle {
    return new Rectangle(0, 0, 0, 0);
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }

  /**
   * Creates a clone of this Rectangle.
   *
   * @return a copy of the rectangle
   */
  clone(): Rectangle {
    return new Rectangle(this.x, this.y, this.width, this.height);
  }

  /**
   * Copies another rectangle to this one.
   *
   * @return Returns itself.
   */
  copyFrom(rectangle: Rectangle): Rectangle {
    this.x = rectangle.x;
    this.y = rectangle.y;
    this.width = rectangle.width;
    this.height = rectangle.height;

    return this;
  }

  /**
   * Copies this rectangle to another one.
   *
   * @return Returns given rectangle.
   */
  copyTo(rectangle: Rectangle): Rectangle {
    rectangle.x = this.x;
    rectangle.y = this.y;
    rectangle.width = this.width;
    rectangle.height = this.height;

    return rectangle;
  }

  /**
   * Checks whether the x and y coordinates given are contained within this Rectangle
   *
   * @param x - The X coordinate of the point to test
   * @param y - The Y coordinate of the point to test
   * @return Whether the x/y coordinates are within this Rectangle
   */
  contains(x: number, y: number): boolean {
    if (this.width <= 0 || this.height <= 0) {
      return false;
    }

    if (x >= this.x && x <= this.right) {
      if (y >= this.y && y <= this.bottom) {
        return true;
      }
    }

    return false;
  }

  isEqual(rect: Rectangle): boolean {
    return (
      this.x === rect.x &&
      this.y === rect.y &&
      this.width === rect.width &&
      this.height === rect.height
    );
  }

  containsRectangle(rect: Rectangle): boolean {
    return (
      rect.left >= this.left &&
      rect.right <= this.right &&
      rect.top >= this.top &&
      rect.bottom <= this.bottom
    );
  }

  /**
   * Pads the rectangle making it grow in all directions.
   * If paddingY is omitted, both paddingX and paddingY will be set to paddingX.
   *
   * @param [paddingX] - The horizontal padding amount.
   * @param [paddingY] - The vertical padding amount.
   */
  pad(paddingX = 0, paddingY = paddingX): this {
    this.x -= paddingX;
    this.y -= paddingY;

    this.width += paddingX * 2;
    this.height += paddingY * 2;

    return this;
  }

  /**
   * Fits this rectangle around the passed one.
   * Intersection 交集
   */
  fit(rectangle: Rectangle): this {
    const x1 = Math.max(this.x, rectangle.x);
    const x2 = Math.min(this.x + this.width, rectangle.x + rectangle.width);
    const y1 = Math.max(this.y, rectangle.y);
    const y2 = Math.min(this.y + this.height, rectangle.y + rectangle.height);

    this.x = x1;
    this.width = Math.max(x2 - x1, 0);
    this.y = y1;
    this.height = Math.max(y2 - y1, 0);

    return this;
  }

  /**
   * Enlarges rectangle that way its corners lie on grid
   */
  ceil(resolution = 1, precision = 0.001): this {
    const x2 = Math.ceil((this.x + this.width - precision) * resolution) / resolution;
    const y2 = Math.ceil((this.y + this.height - precision) * resolution) / resolution;

    this.x = Math.floor((this.x + precision) * resolution) / resolution;
    this.y = Math.floor((this.y + precision) * resolution) / resolution;

    this.width = x2 - this.x;
    this.height = y2 - this.y;

    return this;
  }

  /**
   * Enlarges this rectangle to include the passed rectangle.
   */
  enlarge(rectangle: Rectangle): this {
    const x1 = Math.min(this.x, rectangle.x);
    const x2 = Math.max(this.x + this.width, rectangle.x + rectangle.width);
    const y1 = Math.min(this.y, rectangle.y);
    const y2 = Math.max(this.y + this.height, rectangle.y + rectangle.height);

    this.x = x1;
    this.width = x2 - x1;
    this.y = y1;
    this.height = y2 - y1;

    return this;
  }

  get center(): IPoint {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    };
  }

  get rightBottom(): IPoint {
    return {
      x: this.right,
      y: this.bottom,
    };
  }

  get leftBottom(): IPoint {
    return {
      x: this.left,
      y: this.bottom,
    };
  }

  get rightTop(): IPoint {
    return {
      x: this.right,
      y: this.top,
    };
  }

  get leftTop(): IPoint {
    return {
      x: this.left,
      y: this.top,
    };
  }

  get bottomCenter(): IPoint {
    return {
      x: this.x + this.width / 2,
      y: this.bottom,
    };
  }

  get topCenter(): IPoint {
    return {
      x: this.x + this.width / 2,
      y: this.top,
    };
  }

  get rightCenter(): IPoint {
    return {
      x: this.right,
      y: this.y + this.height / 2,
    };
  }

  get leftCenter(): IPoint {
    return {
      x: this.left,
      y: this.y + this.height / 2,
    };
  }

  update(fn: (rect: Rectangle) => Rectangle): Rectangle {
    return fn(this);
  }

  get crossDistance(): number {
    return Point.getDistance(this.leftTop, this.rightBottom);
  }

  toStyleStr(): string {
    return `left: ${this.x}px; top: ${this.y}px; width: ${this.width}px; height: ${this.height}px;`;
  }

  withPadding(padding: PaddingSchema) {
    this.x -= padding.left;
    this.y -= padding.top;
    this.width += padding.left + padding.right;
    this.height += padding.top + padding.bottom;
    return this;
  }

  withoutPadding(padding: PaddingSchema) {
    this.x += padding.left;
    this.y += padding.top;
    this.width = this.width - padding.left - padding.right;
    this.height = this.height - padding.top - padding.bottom;
    return this;
  }

  withHeight(height: number) {
    this.height = height;
    return this;
  }

  clearSpace() {
    this.width = 0;
    this.height = 0;
    return this;
  }
}

export enum RectangleAlignType {
  ALIGN_LEFT = 'align-left',
  ALIGN_CENTER = 'align-center',
  ALIGN_RIGHT = 'align-right',
  ALIGN_TOP = 'align-top',
  ALIGN_MIDDLE = 'align-middle',
  ALIGN_BOTTOM = 'align-bottom',
  DISTRIBUTE_HORIZONTAL = 'distribute-horizontal',
  DISTRIBUTE_VERTICAL = 'distribute-vertical',
}

export enum RectangleAlignTitle {
  ALIGN_LEFT = '左对齐',
  ALIGN_CENTER = '左右居中对齐',
  ALIGN_RIGHT = '右对齐',
  ALIGN_TOP = '上对齐',
  ALIGN_MIDDLE = '上下居中对齐',
  ALIGN_BOTTOM = '下对齐',
  DISTRIBUTE_HORIZONTAL = '水平平均分布',
  DISTRIBUTE_VERTICAL = '垂直平均分布',
}

// `branch not covered`
// @see https://github.com/istanbuljs/nyc/issues/1209
export namespace Rectangle {
  /**
   * 矩形对齐
   */
  export function align(rectangles: Rectangle[], type: RectangleAlignType): Rectangle[] {
    if (rectangles.length <= 1) return rectangles;
    switch (type) {
      /**
       * 下对齐
       */
      case RectangleAlignType.ALIGN_BOTTOM:
        const maxBottom = Math.max(...rectangles.map((r) => r.bottom));
        rectangles.forEach((rect) => {
          rect.y = maxBottom - rect.height;
        });
        break;
      /**
       * 左右居中对齐
       */
      case RectangleAlignType.ALIGN_CENTER:
        const centerX = enlarge(rectangles).center.x;
        rectangles.forEach((rect) => {
          rect.x = centerX - rect.width / 2;
        });
        break;
      /**
       * 左对齐
       */
      case RectangleAlignType.ALIGN_LEFT:
        const minLeft = Math.min(...rectangles.map((r) => r.left));
        rectangles.forEach((rect) => {
          rect.x = minLeft;
        });
        break;
      /**
       * 上下居中对齐
       */
      case RectangleAlignType.ALIGN_MIDDLE:
        const centerY = enlarge(rectangles).center.y;
        rectangles.forEach((rect) => {
          rect.y = centerY - rect.height / 2;
        });
        break;
      /**
       * 右对齐
       */
      case RectangleAlignType.ALIGN_RIGHT:
        const maxRight = Math.max(...rectangles.map((r) => r.right));
        rectangles.forEach((rect) => {
          rect.x = maxRight - rect.width;
        });
        break;
      /**
       * 上对齐
       */
      case RectangleAlignType.ALIGN_TOP:
        const minTop = Math.min(...rectangles.map((r) => r.top));
        rectangles.forEach((rect) => {
          rect.y = minTop;
        });
        break;
      /**
       * 水平平均分布
       */
      case RectangleAlignType.DISTRIBUTE_HORIZONTAL:
        // 只支持大于三个
        if (rectangles.length <= 2) break;
        const sort = rectangles.slice().sort((r1, r2) => r1.left - r2.left);
        const bounds = enlarge(rectangles);
        const space =
          rectangles.reduce((s, rect) => s - rect.width, bounds.width) / (rectangles.length - 1);
        sort.reduce((left, rect) => {
          rect.x = left;
          return left + rect.width + space;
        }, bounds.x);
        break;
      /**
       * 垂直平均分布
       */
      case RectangleAlignType.DISTRIBUTE_VERTICAL:
        if (rectangles.length <= 2) break;
        const sort2 = rectangles.slice().sort((r1, r2) => r1.top - r2.top);
        const bounds2 = enlarge(rectangles);
        const space2 =
          rectangles.reduce((s, rect) => s - rect.height, bounds2.height) / (rectangles.length - 1);
        sort2.reduce((top, rect) => {
          rect.y = top;
          return top + rect.height + space2;
        }, bounds2.y);
        break;
      default:
        break;
    }
    return rectangles;
  }

  /**
   * 获取所有矩形的外围最大边框
   */
  export function enlarge(rectangles: Rectangle[]): Rectangle {
    const result = Rectangle.EMPTY.clone();
    if (!rectangles.length) return result;
    const lefts: number[] = [];
    const tops: number[] = [];
    const rights: number[] = [];
    const bottoms: number[] = [];
    rectangles.forEach((r) => {
      lefts.push(r.left);
      rights.push(r.right);
      bottoms.push(r.bottom);
      tops.push(r.top);
    });
    // 使用原生的 apply 减少一次复制
    // eslint-disable-next-line prefer-spread
    const left = Math.min.apply(Math, lefts);
    // eslint-disable-next-line prefer-spread
    const right = Math.max.apply(Math, rights);
    // eslint-disable-next-line prefer-spread
    const top = Math.min.apply(Math, tops);
    // eslint-disable-next-line prefer-spread
    const bottom = Math.max.apply(Math, bottoms);
    result.x = left;
    result.width = right - left;
    result.y = top;
    result.height = bottom - top;
    return result;
  }

  /**
   * 判断矩形相交
   *
   * @param [direction] 判断单一方向
   */
  export function intersects(
    target1: Rectangle,
    target2: Rectangle,
    direction?: 'horizontal' | 'vertical'
  ): boolean {
    const left1 = target1.left;
    const top1 = target1.top;
    const right1 = target1.right;
    const bottom1 = target1.bottom;
    const left2 = target2.left;
    const top2 = target2.top;
    const right2 = target2.right;
    const bottom2 = target2.bottom;

    if (direction === 'horizontal') return right1 > left2 && left1 < right2;
    if (direction === 'vertical') return bottom1 > top2 && top1 < bottom2;
    if (right1 > left2 && left1 < right2) {
      if (bottom1 > top2 && top1 < bottom2) {
        return true;
      }
    }
    return false;
  }

  /**
   * 使用 OBB 算法判断两个旋转矩形是否相交
   * @param rotate1 单位 radian
   * @param rotate2 单位 radian
   */
  export function intersectsWithRotation(
    rect1: Rectangle,
    rotate1: number,
    rect2: Rectangle,
    rotate2: number
  ): boolean {
    const obb1 = new OBBRect(rect1.center, rect1.width, rect1.height, rotate1);
    const obb2 = new OBBRect(rect2.center, rect2.width, rect2.height, rotate2);
    const nv = obb1.centerPoint.sub(obb2.centerPoint);
    const axisA1 = obb1.axesX;
    if (
      obb1.getProjectionRadius(axisA1) + obb2.getProjectionRadius(axisA1) <=
      Math.abs(nv.dot(axisA1))
    )
      return false;
    const axisA2 = obb1.axesY;
    if (
      obb1.getProjectionRadius(axisA2) + obb2.getProjectionRadius(axisA2) <=
      Math.abs(nv.dot(axisA2))
    )
      return false;
    const axisB1 = obb2.axesX;
    if (
      obb1.getProjectionRadius(axisB1) + obb2.getProjectionRadius(axisB1) <=
      Math.abs(nv.dot(axisB1))
    )
      return false;
    const axisB2 = obb2.axesY;
    if (
      obb1.getProjectionRadius(axisB2) + obb2.getProjectionRadius(axisB2) <=
      Math.abs(nv.dot(axisB2))
    )
      return false;
    return true;
  }
  /**
   * 判断指定 rect 是否在 viewport 可见
   *
   * @param rotation rect 旋转，单位 radian
   * @param isContains 整个 bounds 是否全部可见
   */
  export function isViewportVisible(
    rect: Rectangle,
    viewport: Rectangle,
    rotation = 0,
    isContains = false
  ): boolean {
    if (isContains) {
      return viewport.containsRectangle(rect);
    }
    if (rotation === 0) return Rectangle.intersects(rect, viewport);
    return Rectangle.intersectsWithRotation(rect, rotation, viewport, 0);
  }

  /**
   * 保证bounds 永远在 viewport 里边
   *
   * @param bounds
   * @param viewport
   * @param padding 距离 viewport 的安全边界
   */
  export function setViewportVisible(
    bounds: Rectangle,
    viewport: Rectangle,
    padding = 0
  ): Rectangle {
    const { left: tLeft, right: tRight, top: tTop, bottom: tBottom, width, height } = bounds;
    const { left: vLeft, right: vRight, top: vTop, bottom: vBottom } = viewport;
    if (tLeft <= vLeft) {
      // 最左边
      bounds.x = vLeft + padding;
    } else if (tRight >= vRight) {
      // 最右边
      bounds.x = vRight - padding - width;
    }
    if (tTop <= vTop) {
      // 最上边
      bounds.y = vTop + padding;
    } else if (tBottom >= vBottom) {
      // 最下边
      bounds.y = vBottom - padding - height;
    }
    return bounds;
  }
  /**
   * 根据两点创建矩形
   */
  export function createRectangleWithTwoPoints(point1: IPoint, point2: IPoint): Rectangle {
    const x = point1.x < point2.x ? point1.x : point2.x;
    const y = point1.y < point2.y ? point1.y : point2.y;
    const width = Math.abs(point1.x - point2.x);
    const height = Math.abs(point1.y - point2.y);
    return new Rectangle(x, y, width, height);
  }
}

/**
 * Oriented Bounding Box (OBB)
 * @see https://en.wikipedia.org/wiki/Bounding_volume
 */
export class OBBRect {
  readonly axesX: Vector2;

  readonly axesY: Vector2;

  readonly centerPoint: Vector2;

  /**
   * @param rotation in radian
   */
  constructor(
    centerPoint: IPoint,
    protected width: number,
    protected height: number,
    rotation: number
  ) {
    this.centerPoint = new Vector2(centerPoint.x, centerPoint.y);
    this.axesX = new Vector2(Math.cos(rotation), Math.sin(rotation));
    this.axesY = new Vector2(-1 * this.axesX.y, this.axesX.x);
  }

  /**
   * 计算投影半径
   */
  getProjectionRadius(axis: Vector2): number {
    return (
      (this.width / 2) * Math.abs(axis.dot(this.axesX)) +
      (this.height / 2) * Math.abs(axis.dot(this.axesY))
    );
  }
}
