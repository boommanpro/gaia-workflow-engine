/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FieldModelState } from './types/field';
import { FormModelState } from './types';

export const DEFAULT_FIELD_STATE: FieldModelState = {
  invalid: false,
  isDirty: false,
  isTouched: false,
  isValidating: false,
};
export const DEFAULT_FORM_STATE: FormModelState = {
  invalid: false,
  isDirty: false,
  isTouched: false,
  isValidating: false,
};

export function createFormModelState(initialState?: Partial<FormModelState>) {
  if (!initialState) {
    return { ...DEFAULT_FORM_STATE };
  }
  return { ...DEFAULT_FORM_STATE, ...initialState };
}

export function createFieldModelState(initialState?: Partial<FieldModelState>): FieldModelState {
  if (!initialState) {
    return { ...DEFAULT_FIELD_STATE };
  }
  return { ...DEFAULT_FIELD_STATE, ...initialState };
}
