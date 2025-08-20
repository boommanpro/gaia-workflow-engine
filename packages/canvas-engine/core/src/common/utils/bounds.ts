/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type Matrix, Point, Rectangle } from '@flowgram.ai/utils';

import type { PositionSchema, TransformSchema } from '../schema';

type TransformOriginAndSize = Pick<TransformSchema, 'origin'> & Pick<TransformSchema, 'size'>;

const { fixZero } = Point;

export namespace Bounds {
  /**
   * 位置做矩阵偏移
   */
  export function getPointWithMatrix(output: PositionSchema, matrix?: Matrix): PositionSchema {
    // if (target.rotation !== 0) {
    // rotateAround(output, target.position.x, target.position.y, target.rotation);
    // }
    if (matrix) {
      matrix.apply(output, output);
    }
    // fix: -0
    fixZero(output);
    return output;
  }
  /**
   * 获取外围边界矩形
   */
  export function getBounds(target: TransformOriginAndSize, matrix?: Matrix): Rectangle {
    const output = new Rectangle();
    if (!matrix || matrix.isSimple()) {
      const { size, origin } = target;
      output.x = -(size.width * origin.x) + (matrix?.tx || 0);
      output.y = -(size.height * origin.y) + (matrix?.ty || 0);
      output.width = size.width;
      output.height = size.height;
      // fix: -0
      fixZero(output);
    } else {
      const topLeft = getTopLeft(target, matrix);
      const topRight = getTopRight(target, matrix);
      const bottomLeft = getBottomLeft(target, matrix);
      const bottomRight = getBottomRight(target, matrix);
      output.x = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
      output.y = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
      output.width = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) - output.x;
      output.height = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) - output.y;
    }
    return output;
  }
  export function applyMatrix(bounds: Rectangle, matrix: Matrix): Rectangle {
    const output = new Rectangle();
    if (matrix.isSimple()) {
      output.x = bounds.x + matrix.tx;
      output.y = bounds.y + matrix.ty;
      output.width = bounds.width;
      output.height = bounds.height;
      // fix: -0
      fixZero(output);
    } else {
      const topLeft = getPointWithMatrix(bounds.leftTop, matrix);
      const topRight = getPointWithMatrix(bounds.rightTop, matrix);
      const bottomLeft = getPointWithMatrix(bounds.leftBottom, matrix);
      const bottomRight = getPointWithMatrix(bounds.rightBottom, matrix);
      output.x = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
      output.y = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
      output.width = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) - output.x;
      output.height = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) - output.y;
    }
    return output;
  }

  /**
   * 找到边框中最左边的点
   */
  export function getLeftPointFromBounds(
    target: TransformOriginAndSize,
    matrix?: Matrix,
  ): PositionSchema {
    const topLeft = getTopLeft(target, matrix);
    const topRight = getTopRight(target, matrix);
    const bottomLeft = getBottomLeft(target, matrix);
    const bottomRight = getBottomRight(target, matrix);
    const items = [topLeft, topRight, bottomLeft, bottomRight].sort((p1, p2) => p1.x - p2.x);
    return items[0];
  }
  /**
   * 找到边框中最上边的点
   */
  export function getTopPointFromBounds(
    target: TransformOriginAndSize,
    matrix?: Matrix,
  ): PositionSchema {
    const topLeft = getTopLeft(target, matrix);
    const topRight = getTopRight(target, matrix);
    const bottomLeft = getBottomLeft(target, matrix);
    const bottomRight = getBottomRight(target, matrix);
    const items = [topLeft, topRight, bottomLeft, bottomRight].sort((p1, p2) => p1.y - p2.y);
    return items[0];
  }
  export function getCenter(target: TransformSchema, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x) + size.width / 2,
      y: -(size.height * origin.y) + size.height / 2,
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getTopLeft(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x),
      y: -(size.height * origin.y),
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getTopCenter(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x) + size.width / 2,
      y: -(size.height * origin.y),
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getTopRight(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x) + size.width,
      y: -(size.height * origin.y),
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getLeftCenter(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x),
      y: -(size.height * origin.y) + size.height / 2,
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getRightCenter(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x) + size.width,
      y: -(size.height * origin.y) + size.height / 2,
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getBottomLeft(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x),
      y: -(size.height * origin.y) + size.height,
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getBottomCenter(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x) + size.width / 2,
      y: -(size.height * origin.y) + size.height,
    };
    return getPointWithMatrix(output, matrix);
  }
  export function getBottomRight(target: TransformOriginAndSize, matrix?: Matrix): PositionSchema {
    const { size, origin } = target;
    const output = {
      x: -(size.width * origin.x) + size.width,
      y: -(size.height * origin.y) + size.height,
    };
    return getPointWithMatrix(output, matrix);
  }
}
