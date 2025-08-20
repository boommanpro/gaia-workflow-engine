/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/document';

import { DataEvent, FormMeta } from '../src/types';
import { defineFormPluginCreator } from '../src/form-plugin';
import { FormModelV2 } from '../src/form-model-v2';

describe('FormModelV2 plugins', () => {
  const node = {
    getService: vi.fn().mockReturnValue({}),
    getData: vi.fn().mockReturnValue({ fireChange: vi.fn() }),
  } as unknown as FlowNodeEntity;

  let formModelV2 = new FormModelV2(node);

  beforeEach(() => {
    formModelV2.dispose();
    formModelV2 = new FormModelV2(node);
  });

  it('should call onInit when formModel init', () => {
    const mockInit = vi.fn();
    const plugin = defineFormPluginCreator({
      name: 'test',
      onInit: mockInit,
    })({ opt1: 1 });
    const formMeta = {
      render: vi.fn(),
      plugins: [plugin],
    } as unknown as FormMeta;
    formModelV2.init(formMeta);

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockInit).toHaveBeenCalledWith(
      { formModel: formModelV2, ...formModelV2.nodeContext },
      { opt1: 1 }
    );
  });

  it('should call onDispose when formModel dispose', () => {
    const mockDispose = vi.fn();
    const plugin = defineFormPluginCreator({
      name: 'test',
      onDispose: mockDispose,
    })({ opt1: 1 });
    const formMeta = {
      render: vi.fn(),
      plugins: [plugin],
    } as unknown as FormMeta;
    formModelV2.init(formMeta);
    formModelV2.dispose();

    expect(mockDispose).toHaveBeenCalledOnce();
    expect(mockDispose).toHaveBeenCalledWith(
      { formModel: formModelV2, ...formModelV2.nodeContext },
      { opt1: 1 }
    );
  });

  it('should call effects when corresponding events trigger', () => {
    const mockEffectPlugin = vi.fn();
    const mockEffectOrigin = vi.fn();

    const plugin = defineFormPluginCreator({
      name: 'test',
      onSetupFormMeta(ctx, opts) {
        ctx.mergeEffect({
          a: [
            {
              event: DataEvent.onValueInitOrChange,
              effect: mockEffectPlugin,
            },
          ],
        });
      },
    })({ opt1: 1 });

    const formMeta = {
      render: vi.fn(),
      effect: {
        a: [
          {
            event: DataEvent.onValueInitOrChange,
            effect: mockEffectOrigin,
          },
        ],
      },
      plugins: [plugin],
    } as unknown as FormMeta;

    formModelV2.init(formMeta, { a: 0 });

    expect(mockEffectPlugin).toHaveBeenCalledOnce();
    expect(mockEffectOrigin).toHaveBeenCalledOnce();
  });

  it('should call effects when corresponding events trigger: array case', () => {
    const mockEffectPluginArrStar = vi.fn();
    const mockEffectOriginArrStar = vi.fn();
    const mockEffectPluginOther = vi.fn();

    const plugin = defineFormPluginCreator({
      name: 'test',
      onSetupFormMeta(ctx, opts) {
        ctx.mergeEffect({
          'arr.*': [
            {
              event: DataEvent.onValueChange,
              effect: mockEffectPluginArrStar,
            },
          ],
          other: [
            {
              event: DataEvent.onValueChange,
              effect: mockEffectPluginOther,
            },
          ],
        });
      },
    })({ opt1: 1 });

    const formMeta = {
      render: vi.fn(),
      effect: {
        'arr.*': [
          {
            event: DataEvent.onValueChange,
            effect: mockEffectOriginArrStar,
          },
        ],
      },
      plugins: [plugin],
    } as unknown as FormMeta;

    formModelV2.init(formMeta, { arr: [0], other: 1 });
    expect(mockEffectOriginArrStar).not.toHaveBeenCalled();
    expect(mockEffectPluginArrStar).not.toHaveBeenCalled();
    expect(mockEffectPluginOther).not.toHaveBeenCalled();

    formModelV2.setValueIn('arr.0', 2);
    formModelV2.setValueIn('other', 2);

    expect(mockEffectOriginArrStar).toHaveBeenCalledOnce();
    expect(mockEffectPluginArrStar).toHaveBeenCalledOnce();
    expect(mockEffectPluginOther).toHaveBeenCalledOnce();
  });
});
