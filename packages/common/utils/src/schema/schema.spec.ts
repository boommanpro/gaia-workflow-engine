/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// nolint: cyclo_complexity,method_line
import { describe, test, expect } from 'vitest';

import { deepFreeze } from '../objects';
import { SizeSchema, TransformSchema } from './schema-transform';
import { PaddingSchema, TintSchema } from './schema-base';
import { Schema, SchemaDecoration } from './schema';

describe('schema', () => {
  test('TintSchema', async () => {
    expect(TintSchema.isEmpty(undefined)).toEqual(true);
    expect(TintSchema.isEmpty({})).toEqual(true);
    expect(TintSchema.isEmpty({ topLeft: '' })).toEqual(false);
  });

  test('PaddingSchema', async () => {
    expect(PaddingSchema.empty()).toEqual({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    });
  });

  test('SchemaDecoration', async () => {
    expect(SchemaDecoration).not.toBeUndefined();
    expect(SchemaDecoration.create({})).toEqual({
      type: 'object',
      properties: {},
      mixinDefaults: {},
    });
    expect(
      SchemaDecoration.create(
        { tip: { type: 'string' } },
        {
          type: 'string',
          properties: { tip: { type: 'integer' } },
          mixinDefaults: { test: 0 },
        },
        { test: 1 },
      ),
    ).toEqual({
      type: 'object',
      properties: { tip: { type: 'string' } },
      mixinDefaults: { test: 1 },
    });
  });

  describe('Schema', () => {
    test('Schema', async () => {
      expect(Schema).not.toBeUndefined();
      expect(Schema.createDefault({ type: 'object' })).toEqual(undefined);
      expect(
        Schema.createDefault({
          type: 'object',
          default: { tik: 11, tok: '22' },
        }),
      ).toEqual({
        tik: 11,
        tok: '22',
      });
      expect(
        Schema.createDefault({
          type: 'object',
          default: () => ({ tik: 11, tok: '22' }),
        }),
      ).toEqual({
        tik: 11,
        tok: '22',
      });
      expect(
        Schema.createDefault({
          type: 'object',
          properties: {
            tik: { type: 'integer', default: 1 },
            tok: { type: 'string', default: '2' },
          },
        }),
      ).toEqual({
        tik: 1,
        tok: '2',
      });
      expect(
        Schema.createDefault(
          {
            type: 'object',
            properties: {
              tik: { type: 'integer' },
              tok: { type: 'string' },
            },
            mixinDefaults: { tik: 111, tok: '222' },
          },
          { tik: 1111, tok: '2222' },
        ),
      ).toEqual({
        tik: 1111,
        tok: '2222',
      });
      expect(
        Schema.createDefault(
          {
            type: 'object',
            properties: {
              tik: { type: 'integer' },
              tok: { type: 'string' },
            },
            mixinDefaults: { 'pre.tik': 111, 'pre.tok': '222' },
          },
          { 'pre.tik': 1111, 'pre.tok': '2222' },
          'pre',
        ),
      ).toEqual({
        tik: 1111,
        tok: '2222',
      });
    });

    test('isBaseType', () => {
      expect(Schema.isBaseType({ type: 'string' })).toBeTruthy();
      expect(Schema.isBaseType({ type: 'array' })).toBeFalsy();
      expect(Schema.isBaseType({ type: 'object' })).toBeFalsy();
    });
  });

  describe('TransformSchema', () => {
    test('TransformSchema', () => {
      expect(TransformSchema).not.toBeUndefined();
    });

    const def = deepFreeze({
      origin: { x: 0.5, y: 0.5 },
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      size: { width: 0, height: 0, locked: false },
      skew: { x: 0, y: 0 },
    });

    test('createDefault', () => {
      expect(TransformSchema.createDefault()).toEqual(def);
    });

    test('toJSON', () => {
      const schema1 = { ...def, test: 1 };
      expect(TransformSchema.toJSON(schema1)).toEqual(def);
    });

    test('getDelta', () => {
      const oldTransform = def;
      const newTransform = TransformSchema.createDefault();
      expect(TransformSchema.getDelta(oldTransform, newTransform)).toEqual({
        origin: { x: 0, y: 0 },
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
        skew: { x: 0, y: 0 },
      });

      const newTransform1: TransformSchema = {
        origin: { x: 1, y: 0.5 },
        position: { x: 1, y: 0 },
        rotation: 1,
        scale: { x: 2, y: 1 },
        size: { width: 1, height: 0, locked: false },
        skew: { x: 1, y: 0 },
      };
      expect(TransformSchema.getDelta(oldTransform, newTransform1)).toEqual({
        origin: { x: 0.5, y: 0 },
        position: { x: 1, y: 0 },
        rotation: 1,
        scale: { x: 1, y: 0 },
        size: { width: 1, height: 0 },
        skew: { x: 1, y: 0 },
      });
    });

    test('mergeDelta', () => {
      const oldTransform = def;
      const delta = {
        origin: { x: 0.5, y: 0 },
        position: { x: 1, y: 0 },
        rotation: 1,
        scale: { x: 1, y: 0 },
        size: { width: 1, height: 0 },
        skew: { x: 1, y: 0 },
      };
      expect(TransformSchema.mergeDelta(oldTransform, delta)).toEqual({
        origin: { x: 1, y: 0.5 },
        position: { x: 1, y: 0 },
        rotation: 1,
        scale: { x: 2, y: 1 },
        size: { width: 1, height: 0, locked: false },
        skew: { x: 1, y: 0 },
      });
      expect(TransformSchema.mergeDelta(oldTransform, delta, 1)).toEqual({
        origin: { x: 1, y: 0.5 },
        position: { x: 1, y: 0 },
        rotation: 1,
        scale: { x: 2, y: 1 },
        size: { width: 1, height: 0, locked: false },
        skew: { x: 1, y: 0 },
      });
    });

    test('is', () => {
      expect(TransformSchema.is(def)).toBeTruthy();
      expect(TransformSchema.is({})).toBeFalsy();
      // FIXME?
      expect(
        TransformSchema.is({
          position: { x: 0 },
          size: { width: 0 },
        }),
      ).toBeTruthy();
    });
  });

  describe('SizeSchema', () => {
    test('fixSize', () => {
      expect(SizeSchema.fixSize({ width: 1, height: 1 }, { width: 1, height: 1 })).toBe(1);
      expect(SizeSchema.fixSize({ width: 2, height: 1 }, { width: 1, height: 1 })).toBeCloseTo(0.5);
      expect(SizeSchema.fixSize({ width: 2, height: 4 }, { width: 1, height: 1 })).toBeCloseTo(
        0.25,
      );
    });

    test('coverSize', () => {
      expect(SizeSchema.coverSize({ width: 1, height: 1 }, { width: 1, height: 1 })).toBe(1);
      expect(SizeSchema.coverSize({ width: 2, height: 1 }, { width: 1, height: 1 })).toBeCloseTo(1);
      expect(SizeSchema.coverSize({ width: 2, height: 4 }, { width: 1, height: 1 })).toBeCloseTo(
        0.5,
      );
    });

    test('empty', () => {
      expect(SizeSchema.empty()).toEqual({ width: 0, height: 0 });
    });
  });
});
