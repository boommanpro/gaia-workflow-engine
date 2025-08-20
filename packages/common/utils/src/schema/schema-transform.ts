/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Schema, type SchemaDecoration } from './schema';

export interface PositionSchema {
  x: number;
  y: number;
}

export type RotationSchema = number;

export interface OriginSchema {
  x: number;
  y: number;
}

export interface ScaleSchema {
  x: number;
  y: number;
}

export interface ScrollSchema {
  scrollX: number;
  scrollY: number;
}

export interface SizeSchema {
  width: number;
  height: number;
  locked?: boolean; // 是否开启等比锁
}

export interface SkewSchema {
  x: number;
  y: number;
}

export interface TransformSchema {
  position: PositionSchema;
  size: SizeSchema;
  origin: OriginSchema;
  scale: ScaleSchema;
  skew: SkewSchema;
  rotation: RotationSchema;
}

export const SizeSchemaDecoration: SchemaDecoration<SizeSchema> = {
  label: '大小',
  properties: {
    width: { label: '宽', default: 0, type: 'float' },
    height: { label: '高', default: 0, type: 'float' },
    locked: { label: '等比锁', default: false, type: 'boolean' },
  },
  type: 'object',
};

export const OriginSchemaDecoration: SchemaDecoration<OriginSchema> = {
  label: '原点',
  description: '用于设置旋转的中心位置',
  properties: {
    x: { label: 'x', default: 0.5, type: 'float' },
    y: { label: 'y', default: 0.5, type: 'float' },
  },
  type: 'object',
};

export const PositionSchemaDecoration: SchemaDecoration<PositionSchema> = {
  label: '位置',
  properties: {
    x: { label: 'x', default: 0, type: 'float' },
    y: { label: 'y', default: 0, type: 'float' },
  },
  type: 'object',
};

export const RotationSchemaDecoration: SchemaDecoration<RotationSchema> = {
  label: '旋转',
  type: 'float',
  default: 0,
};

export const ScaleSchemaDecoration: SchemaDecoration<ScaleSchema> = {
  label: '缩放',
  properties: {
    x: { label: 'x', default: 1, type: 'float' },
    y: { label: 'y', default: 1, type: 'float' },
  },
  type: 'object',
};
export const SkewSchemaDecoration: SchemaDecoration<SkewSchema> = {
  label: '倾斜',
  properties: {
    x: { label: 'x', default: 0, type: 'float' },
    y: { label: 'y', default: 0, type: 'float' },
  },
  type: 'object',
};

export const TransformSchemaDecoration: SchemaDecoration<TransformSchema> = {
  properties: {
    position: PositionSchemaDecoration,
    size: SizeSchemaDecoration,
    origin: OriginSchemaDecoration,
    scale: ScaleSchemaDecoration,
    skew: SkewSchemaDecoration,
    rotation: RotationSchemaDecoration,
  },
  type: 'object',
};
export namespace TransformSchema {
  export function createDefault(): TransformSchema {
    return Schema.createDefault<TransformSchema>(TransformSchemaDecoration);
  }

  export function toJSON(obj: TransformSchema): TransformSchema {
    return {
      position: { x: obj.position.x, y: obj.position.y },
      size: {
        width: obj.size.width,
        height: obj.size.height,
        locked: obj.size.locked,
      },
      origin: { x: obj.origin.x, y: obj.origin.y },
      scale: { x: obj.scale.x, y: obj.scale.y },
      skew: { x: obj.skew.x, y: obj.skew.y },
      rotation: obj.rotation,
    };
  }
  export function getDelta(
    oldTransform: TransformSchema,
    newTransform: TransformSchema,
  ): TransformSchema {
    return {
      position: {
        x: newTransform.position.x - oldTransform.position.x,
        y: newTransform.position.y - oldTransform.position.y,
      },
      size: {
        width: newTransform.size.width - oldTransform.size.width,
        height: newTransform.size.height - oldTransform.size.height,
      },
      origin: {
        x: newTransform.origin.x - oldTransform.origin.x,
        y: newTransform.origin.y - oldTransform.origin.y,
      },
      scale: {
        x: newTransform.scale.x - oldTransform.scale.x,
        y: newTransform.scale.y - oldTransform.scale.y,
      },
      skew: {
        x: newTransform.skew.x - oldTransform.skew.x,
        y: newTransform.skew.y - oldTransform.skew.y,
      },
      rotation: newTransform.rotation - oldTransform.rotation,
    };
  }

  export function mergeDelta(
    oldTransform: TransformSchema,
    newTransformDelta: TransformSchema,
    toFixedNum?: number,
  ): TransformSchema {
    const toFixed =
      toFixedNum !== undefined ? (v: number) => Math.round(v * 100) / 100 : (v: number) => v;
    return {
      position: {
        x: toFixed(newTransformDelta.position.x + oldTransform.position.x),
        y: toFixed(newTransformDelta.position.y + oldTransform.position.y),
      },
      size: {
        width: toFixed(newTransformDelta.size.width + oldTransform.size.width),
        height: toFixed(newTransformDelta.size.height + oldTransform.size.height),
        locked: oldTransform.size.locked,
      },
      origin: {
        x: toFixed(newTransformDelta.origin.x + oldTransform.origin.x),
        y: toFixed(newTransformDelta.origin.y + oldTransform.origin.y),
      },
      scale: {
        x: toFixed(newTransformDelta.scale.x + oldTransform.scale.x),
        y: toFixed(newTransformDelta.scale.y + oldTransform.scale.y),
      },
      skew: {
        x: toFixed(newTransformDelta.skew.x + oldTransform.skew.x),
        y: toFixed(newTransformDelta.skew.y + oldTransform.skew.y),
      },
      rotation: newTransformDelta.rotation + oldTransform.rotation,
    };
  }

  export function is(obj: object): obj is TransformSchema {
    return (
      obj &&
      (obj as TransformSchema).position &&
      (obj as TransformSchema).size &&
      typeof (obj as TransformSchema).position.x === 'number' &&
      typeof (obj as TransformSchema).size.width === 'number'
    );
  }
}

export namespace SizeSchema {
  /**
   * 适配父节点宽高
   *
   * @return 返回需要缩放的比例，为 1 则不缩放
   */
  export function fixSize(currentSize: SizeSchema, parentSize: SizeSchema): number {
    if (currentSize.width <= parentSize.width && currentSize.height <= parentSize.height) return 1;
    const wScale = currentSize.width / parentSize.width;
    const hScale = currentSize.height / parentSize.height;
    const scale = wScale > hScale ? wScale : hScale;
    return 1 / scale;
  }

  /**
   * 填充父节点的宽高
   *
   * @return 返回放大的比例
   */
  export function coverSize(currentSize: SizeSchema, parentSize: SizeSchema): number {
    const wScale = currentSize.width / parentSize.width;
    const hScale = currentSize.height / parentSize.height;
    const scale = wScale < hScale ? wScale : hScale;
    return 1 / scale;
  }

  export function empty(): SizeSchema {
    return { width: 0, height: 0 };
  }
}
