/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useContext, useMemo } from 'react';

import { useReadonlyReactiveState } from '@flowgram.ai/reactive';

import { FieldModelState, FieldState } from '../types';
import { toFieldState } from '../core';
import { FieldModelContext } from './context';

/**
 * Get the current field state. It should be used in a child component of <Field />, otherwise it throws an error
 */
export function useCurrentFieldState(): FieldState {
  const fieldModel = useContext(FieldModelContext);

  if (!fieldModel) {
    throw new Error(
      `[Form] useCurrentField Error: field not found, make sure that you are using this hook in a child Component of a Field`
    );
  }

  const fieldModelState = useReadonlyReactiveState<FieldModelState>(fieldModel.reactiveState);

  return useMemo(() => toFieldState(fieldModelState), [fieldModelState]);
}
