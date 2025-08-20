/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useContext, useEffect } from 'react';

import { Disposable, useRefresh } from '@flowgram.ai/utils';

import { Field, FieldArray, FieldName, FieldValue } from '../types';
import { toField } from '../core/to-field';
import { toFieldArray } from '../core';
import { useFormModel } from './utils';
import { FieldModelContext } from './context';

/**
 * @deprecated
 * `useField` is deprecated because its return relies on React render. if the Field is not rendered, the return would be
 * undefined. If you simply want to monitor the change of the value of a certain path, please use `useWatch(fieldName)`
 * @param name
 */
export function useField<
  TFieldValue = FieldValue,
  TField extends Field<TFieldValue> | FieldArray<TFieldValue> = Field<TFieldValue>
>(name?: FieldName): TField | undefined {
  const currentFieldModel = useContext(FieldModelContext);
  const formModel = useFormModel();
  const refresh = useRefresh();
  const fieldModel = name ? formModel.getField(name!) : currentFieldModel;

  useEffect(() => {
    let disposable: Disposable;
    if (fieldModel) {
      disposable = fieldModel.onValueChange(() => refresh());
    }
    return () => {
      disposable?.dispose();
    };
  }, [fieldModel]);

  if (!fieldModel) {
    return undefined;
  }

  if (fieldModel.map) {
    return toFieldArray<TFieldValue>(fieldModel) as unknown as TField;
  }

  return toField(fieldModel) as unknown as TField;
}
