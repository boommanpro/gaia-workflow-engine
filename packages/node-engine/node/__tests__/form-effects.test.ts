/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/document';

import { DataEvent } from '../src/types';
import { FormModelV2 } from '../src/form-model-v2';

describe('FormModelV2 effects', () => {
  const node = {
    getService: vi.fn().mockReturnValue({}),
    getData: vi.fn().mockReturnValue({ fireChange: vi.fn() }),
  } as unknown as FlowNodeEntity;

  let formModelV2 = new FormModelV2(node);

  beforeEach(() => {
    formModelV2.dispose();
    formModelV2 = new FormModelV2(node);
  });

  it('should trigger init effects when initialValues exists', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInit,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1 });
    expect(mockEffect).toHaveBeenCalledOnce();
  });
  it('should trigger init effects when formatOnInit return value', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      formatOnInit: () => ({ a: { b: 1 } }),
      effect: {
        'a.b': [
          {
            event: DataEvent.onValueInit,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta);
    expect(mockEffect).toHaveBeenCalledOnce();
  });
  it('should trigger value change effects', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1 });
    formModelV2.setValueIn('a', 2);
    expect(mockEffect).toHaveBeenCalledOnce();
  });
  it('should trigger onValueInitOrChange effects when form defaultValue init', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1 });
    expect(mockEffect).toHaveBeenCalledOnce();
  });
  it('should trigger onValueInitOrChange effects when field defaultValue init', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta);
    formModelV2.nativeFormModel?.setInitValueIn('a', 2);
    expect(mockEffect).toHaveBeenCalledOnce();
  });
  it('should trigger child onValueInit effects when field defaultValue init', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        'a.b.c': [
          {
            event: DataEvent.onValueInit,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta);
    formModelV2.nativeFormModel?.setInitValueIn('a', { b: { c: 1 } });
    expect(mockEffect).toHaveBeenCalledOnce();
  });
  it('should not trigger child onValueInit effects when field defaultValue init but child path has no value', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        'a.b.c': [
          {
            event: DataEvent.onValueInit,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta);
    formModelV2.nativeFormModel?.setInitValueIn('a', 2);
    expect(mockEffect).not.toHaveBeenCalled();
  });
  it('should trigger onValueInitOrChange effects when value change', () => {
    const mockEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta);
    formModelV2.setValueIn('a', 2);
    expect(mockEffect).toHaveBeenCalledOnce();

    formModelV2.setValueIn('a', {});
    expect(mockEffect).toHaveBeenCalledTimes(2);

    formModelV2.setValueIn('a.b', 2);
    expect(mockEffect).toHaveBeenCalledTimes(3);
  });
  it('should trigger single item init effect when array append', () => {
    const mockArrItemEffect = vi.fn();
    const formMeta = {
      render: vi.fn(),
      effect: {
        ['arr.*']: [
          {
            event: DataEvent.onValueInit,
            effect: mockArrItemEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta);
    const arrModel = formModelV2.nativeFormModel?.createFieldArray('arr');
    arrModel?.append(1);
    arrModel?.append(2);
    expect(mockArrItemEffect).toHaveBeenCalledTimes(2);
  });
  it('should trigger value change effects return when value change', () => {
    const mockEffectReturn = vi.fn();
    const mockEffect = vi.fn(() => mockEffectReturn);

    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1 });
    formModelV2.setValueIn('a', 2);
    formModelV2.setValueIn('a', 3);
    expect(mockEffect).toHaveBeenCalledTimes(2);
    expect(mockEffectReturn).toHaveBeenCalledOnce();
  });
  it('should trigger onValueInitOrChange effects return when value init', () => {
    const mockEffectReturn = vi.fn();
    const mockEffect = vi.fn(() => mockEffectReturn);

    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1 });
    formModelV2.setValueIn('a', 2);
    expect(mockEffectReturn).toHaveBeenCalledOnce();
  });
  it('should trigger onValueInitOrChange effects return when value init and change', () => {
    const mockEffectReturn = vi.fn();
    const mockEffect = vi.fn(() => mockEffectReturn);

    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1 });
    formModelV2.setValueIn('a', 2);
    formModelV2.setValueIn('a', 3);
    // 第一次setValue，触发 init 时记录的return， 第二次setValue 触发 第一次setValue时记录的return， 共2次
    expect(mockEffectReturn).toHaveBeenCalledTimes(2);
  });
  it('should update effect return function each time init or change the value', () => {
    const mockEffectReturn = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2);
    const mockEffect = vi.fn(() => mockEffectReturn);

    const formMeta = {
      render: vi.fn(),
      effect: {
        ['arr.*.var']: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { arr: [] });
    const form = formModelV2.nativeFormModel!;
    const arrayField = form.createFieldArray('arr');
    arrayField!.append({ var: 'x' });
    form.setValueIn('arr.0.var', 'y');

    formModelV2.dispose();

    expect(mockEffectReturn).toHaveNthReturnedWith(1, 1);
    expect(mockEffectReturn).toHaveNthReturnedWith(2, 2);
  });
  it('should trigger effects when setValueIn called in parent name', () => {
    const mockInitEffectReturn = vi.fn();
    const mockInitEffect = vi.fn(() => mockInitEffectReturn);

    const mockInitOrChangeEffectReturn = vi.fn();
    const mockInitOrChangeEffect = vi.fn(() => mockInitOrChangeEffectReturn);

    const mockChangeEffectReturn = vi.fn();
    const mockChangeEffect = vi.fn(() => mockChangeEffectReturn);

    const formMeta = {
      render: vi.fn(),
      effect: {
        'inputsValues.*': [
          {
            event: DataEvent.onValueInit,
            effect: mockInitEffect,
          },
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockInitOrChangeEffect,
          },
          {
            event: DataEvent.onValueChange,
            effect: mockChangeEffect,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { inputsValues: { a: 1 } });
    expect(mockInitEffect).toHaveBeenCalledTimes(1);
    expect(mockInitOrChangeEffect).toHaveBeenCalledTimes(1);
    expect(mockChangeEffect).toHaveBeenCalledTimes(0);

    formModelV2.setValueIn('inputsValues', { a: 2 });
    expect(mockInitEffect).toHaveBeenCalledTimes(1);
    expect(mockInitOrChangeEffect).toHaveBeenCalledTimes(2);
    expect(mockChangeEffect).toHaveBeenCalledTimes(1);

    formModelV2.setValueIn('inputsValues', { b: 3 });
    expect(mockInitEffect).toHaveBeenCalledTimes(2);
    expect(mockInitOrChangeEffect).toHaveBeenCalledTimes(4);
    expect(mockChangeEffect).toHaveBeenCalledTimes(2);

    formModelV2.setValueIn('inputsValues', { b: 4 });
    expect(mockInitEffect).toHaveBeenCalledTimes(2);
    expect(mockInitOrChangeEffect).toHaveBeenCalledTimes(5);
    expect(mockChangeEffect).toHaveBeenCalledTimes(3);

    formModelV2.setValueIn('inputsValues', { a: 1, b: 4 });
    expect(mockInitEffect).toHaveBeenCalledTimes(3);
    expect(mockInitOrChangeEffect).toHaveBeenCalledTimes(6);
    expect(mockChangeEffect).toHaveBeenCalledTimes(3);

    formModelV2.setValueIn('inputsValues', {});
    expect(mockInitEffect).toHaveBeenCalledTimes(3);
    expect(mockInitOrChangeEffect).toHaveBeenCalledTimes(8);
    expect(mockChangeEffect).toHaveBeenCalledTimes(5);
  });
  it('should trigger all effects return when formModel dispose', () => {
    const mockEffectReturn1 = vi.fn();
    const mockEffect1 = vi.fn(() => mockEffectReturn1);
    const mockEffectReturn2 = vi.fn();
    const mockEffect2 = vi.fn(() => mockEffectReturn2);

    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffect1,
          },
        ],
        b: [
          {
            event: DataEvent.onValueInit,
            effect: mockEffect2,
          },
        ],
      },
    };
    formModelV2.init(formMeta, { a: 1, b: 2 });

    formModelV2.dispose();

    expect(mockEffectReturn1).toHaveBeenCalledTimes(1);
    expect(mockEffectReturn2).toHaveBeenCalledTimes(1);
  });
});
