/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useContext } from 'react';

import { Field, FieldArray, FieldValue } from '../types';
import { toField } from '../core/to-field';
import { toFieldArray } from '../core';
import { FieldModelContext } from './context';

/**
 * Get the current Field. It should be used in a child component of <Field />, otherwise it throws an error
 */
export function useCurrentField<
  TFieldValue = FieldValue,
  TField extends Field<TFieldValue> | FieldArray<TFieldValue> = Field<TFieldValue>
>(): Field<TFieldValue> | FieldArray<TFieldValue> {
  const fieldModel = useContext(FieldModelContext);

  if (!fieldModel) {
    throw new Error(
      `[Form] useCurrentField Error: field not found, make sure that you are using this hook in a child Component of a Field`
    );
  }

  return fieldModel.map
    ? (toFieldArray<TFieldValue>(fieldModel) as unknown as FieldArray<TFieldValue>)
    : (toField(fieldModel) as unknown as TField);
}
