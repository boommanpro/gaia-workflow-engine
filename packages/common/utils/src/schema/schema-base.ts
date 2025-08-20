/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type PositionSchema, type SizeSchema } from './schema-transform';
import { type SchemaDecoration } from './schema';

export type OpacitySchema = number;

export interface FlipSchema {
  x: boolean;
  y: boolean;
}

export interface ShadowSchema {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface PaddingSchema {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export namespace PaddingSchema {
  export const empty = () => ({ left: 0, right: 0, top: 0, bottom: 0 });
}

export type MarginSchema = PaddingSchema;

export interface TintSchema {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

export namespace TintSchema {
  export function isEmpty(tint: Partial<TintSchema> | undefined): boolean {
    if (!tint) return true;
    return (
      tint.topLeft === undefined &&
      tint.topRight === undefined &&
      tint.bottomLeft === undefined &&
      tint.bottomRight === undefined
    );
  }
}

export const CropSchemaDecoration: SchemaDecoration<PositionSchema & SizeSchema> = {
  label: '裁剪',
  properties: {
    width: { label: '宽', type: 'integer' },
    height: { label: '高', type: 'integer' },
    x: { label: 'x', type: 'integer' },
    y: { label: 'y', type: 'integer' },
  },
  type: 'object',
};

export const FlipSchemaDecoration: SchemaDecoration<FlipSchema> = {
  label: '镜像替换',
  properties: {
    x: { label: '水平镜像替换', default: false, type: 'boolean' },
    y: { label: '垂直镜像替换', default: false, type: 'boolean' },
  },
  type: 'object',
};
export const PaddingSchemaDecoration: SchemaDecoration<PaddingSchema> = {
  label: '留白',
  properties: {
    left: { label: '左', default: 0, type: 'integer' },
    top: { label: '上', default: 0, type: 'integer' },
    right: { label: '右', default: 0, type: 'integer' },
    bottom: { label: '下', default: 0, type: 'integer' },
  },
  type: 'object',
};

export const ShadowSchemaDecoration: SchemaDecoration<ShadowSchema> = {
  label: '阴影',
  properties: {
    offsetX: { label: 'X', type: 'integer' },
    offsetY: { label: 'Y', type: 'integer' },
    blur: { label: '模糊', type: 'integer' },
    color: { label: '颜色', type: 'color' },
  },
  type: 'object',
};

export const TintSchemaDecoration: SchemaDecoration<TintSchema> = {
  label: '颜色',
  properties: {
    topLeft: { label: '左上', type: 'color' },
    topRight: { label: '右上', type: 'color' },
    bottomLeft: { label: '左下', type: 'color' },
    bottomRight: { label: '右下', type: 'color' },
  },
  type: 'object',
};

export const OpacitySchemaDecoration: SchemaDecoration<OpacitySchema> = {
  label: '透明度',
  type: 'float',
  min: 0,
  max: 1,
  default: 1,
};
