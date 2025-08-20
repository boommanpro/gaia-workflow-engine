/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';

import { Errors } from '@/types';
import { FieldEventUtils, mergeFeedbacks } from '@/core/utils';

describe('core/utils', () => {
  describe('mergeFeedbacks', () => {
    it('should merge when some key in source is empty array', () => {
      const origin = {
        a: ['error'],
        b: ['error'],
      } as unknown as Errors;
      const source = {
        a: [],
      } as unknown as Errors;

      const result = mergeFeedbacks(origin, source);
      expect(result).toEqual({
        a: [],
        b: ['error'],
      });
    });
    it('should merge when some key in source is undefined', () => {
      const origin = {
        a: ['error'],
        b: ['error'],
      } as unknown as Errors;
      const source = {
        a: undefined,
      } as unknown as Errors;

      const result = mergeFeedbacks(origin, source);
      expect(result).toEqual({
        a: undefined,
        b: ['error'],
      });
    });
  });
  describe('FieldEventUtils.shouldTriggerFieldChangeEvent', () => {
    it('array append: should not trigger for all array child or grand child', () => {
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-append',
              indexes: [0],
            },
          },
          'arr.0',
        ),
      ).toBe(false);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-append',
              indexes: [0],
            },
          },
          'arr.0.x',
        ),
      ).toBe(false);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-append',
              indexes: [0],
            },
          },
          'arr',
        ),
      ).toBe(true);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'p.arr',
            options: {
              action: 'array-append',
              indexes: [0],
            },
          },
          'p',
        ),
      ).toBe(true);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: '',
            options: {
              action: 'array-append',
              indexes: [0],
            },
          },
          '0',
        ),
      ).toBe(false);
    });
    it('array splice: should not trigger for array child or grand child  only when index < first spliced index', () => {
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-splice',
              indexes: [0],
            },
          },
          'arr.0',
        ),
      ).toBe(true);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-splice',
              indexes: [0],
            },
          },
          'arr.1',
        ),
      ).toBe(true);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-splice',
              indexes: [1],
            },
          },
          'arr.0',
        ),
      ).toBe(false);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-splice',
              indexes: [1, 2],
            },
          },
          'arr.1',
        ),
      ).toBe(true);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-splice',
              indexes: [4, 5],
            },
          },
          'arr.1',
        ),
      ).toBe(false);
      expect(
        FieldEventUtils.shouldTriggerFieldChangeEvent(
          {
            values: {},
            prevValues: {},
            name: 'arr',
            options: {
              action: 'array-splice',
              indexes: [],
            },
          },
          'arr.1',
        ),
      ).toBe(true);
    });
  });
});
