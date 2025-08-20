/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { FieldArrayModel, FormModel } from '@flowgram.ai/form';
import { HistoryService } from '@flowgram.ai/history';

import * as utils from '../src/utils';
import { createContainer } from './create-container';

function delay(timeout: number) {}

describe('form', () => {
  let formModel: FormModel;
  let historyService: HistoryService;

  beforeEach(() => {
    const container = createContainer();
    formModel = container.formModel;
    historyService = container.historyService;
    vi.spyOn(utils, 'getFormModelV2').mockImplementation(() => formModel as any);
    vi.useFakeTimers();
  });

  it('object set', async () => {
    const obj = formModel.createField('obj');
    const fieldA = formModel.createField('obj.a');
    fieldA.value = 1;
    vi.advanceTimersByTime(500);

    fieldA.value = 2;
    obj.value = { a: 3 };
    await historyService.undo();
    expect(obj.value).toEqual({ a: 1 });
    await historyService.redo();
    expect(obj.value).toEqual({ a: 3 });
  });

  it('array delete', async () => {
    formModel.createFieldArray('arr');
    const arrField = formModel.getField<FieldArrayModel>('arr')!;
    expect(arrField.value).toEqual(undefined);
    arrField.value = ['a', 'b', 'c'];
    expect(arrField.value).toEqual(['a', 'b', 'c']);

    vi.advanceTimersByTime(500);

    arrField.delete(1);
    expect(arrField.value).toEqual(['a', 'c']);
    await historyService.undo();
    expect(arrField.value).toEqual(['a', 'b', 'c']);
    await historyService.redo();
    expect(arrField.value).toEqual(['a', 'c']);
  });

  it('array append', async () => {
    formModel.createFieldArray('arr');
    const arrField = formModel.getField<FieldArrayModel>('arr')!;
    arrField.value = ['a'];
    expect(arrField.value).toEqual(['a']);
    await historyService.undo();
    expect(arrField.value).toEqual(undefined);
    await historyService.redo();
    expect(arrField.value).toEqual(['a']);

    vi.advanceTimersByTime(500);

    arrField.append('b');
    expect(arrField.value).toEqual(['a', 'b']);
    await historyService.undo();
    expect(arrField.value).toEqual(['a']);
    await historyService.redo();
    expect(arrField.value).toEqual(['a', 'b']);
  });

  it('array set', async () => {
    formModel.createFieldArray('arr');
    const arrField = formModel.getField<FieldArrayModel>('arr')!;
    arrField.value = ['a'];
    expect(arrField.value).toEqual(['a']);

    vi.advanceTimersByTime(500);

    formModel.setValueIn('arr.0', undefined);
    expect(arrField.value).toEqual([undefined]);
    await historyService.undo();
    expect(arrField.value).toEqual(['a']);
    await historyService.redo();
    expect(arrField.value).toEqual([undefined]);
  });
});
