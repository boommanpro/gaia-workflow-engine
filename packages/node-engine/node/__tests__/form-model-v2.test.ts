/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/document';

import { FormMeta } from '../src/types';
import { FormModelV2 } from '../src/form-model-v2';

describe('FormModelV2', () => {
  const node = {
    getService: vi.fn().mockReturnValue({}),
    getData: vi.fn().mockReturnValue({ fireChange: vi.fn() }),
  } as unknown as FlowNodeEntity;

  let formModelV2 = new FormModelV2(node);

  beforeEach(() => {
    formModelV2.dispose();
    formModelV2 = new FormModelV2(node);
  });

  describe('v1 apis', () => {
    it('getFormItemValueByPath', () => {
      const formMeta = {
        render: vi.fn(),
      };
      formModelV2.init(formMeta, {
        a: 1,
        b: 2,
      });

      expect(formModelV2.getFormItemValueByPath('/a')).toBe(1);
      expect(formModelV2.getFormItemValueByPath('/b')).toBe(2);
      expect(formModelV2.getFormItemValueByPath('/')).toEqual({ a: 1, b: 2 });
    });
    it('getFormItemByPath when path is /', () => {
      const formMeta = {
        render: vi.fn(),
      };
      formModelV2.init(formMeta, {
        a: 1,
        b: 2,
      });

      const formItem = formModelV2.getFormItemByPath('/');
      expect(formItem?.value).toEqual({
        a: 1,
        b: 2,
      });

      formItem!.value = { a: 3, b: 4 };

      expect(formItem?.value).toEqual({
        a: 3,
        b: 4,
      });
    });
  });

  describe('onFormValueChangeIn', () => {
    beforeEach(() => {
      formModelV2.dispose();
      formModelV2 = new FormModelV2(node);
    });

    it('should trigger callback when value change', () => {
      const mockCallback = vi.fn();
      const formMeta = {
        render: vi.fn(),
      } as unknown as FormMeta;
      formModelV2.init(formMeta, { a: 1 });
      formModelV2.onFormValueChangeIn('a', mockCallback);
      formModelV2.setValueIn('a', 2);

      expect(mockCallback).toHaveBeenCalledOnce();
    });
    it('should throw error when formModel is not initialized', () => {
      expect(() => formModelV2.onFormValueChangeIn('a', vi.fn())).toThrowError();
    });
  });
});
