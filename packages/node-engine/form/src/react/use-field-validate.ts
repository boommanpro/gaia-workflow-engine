/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useContext } from 'react';

import { FieldName } from '../types';
import { useFormModel } from './utils';
import { FieldModelContext } from './context';

/**
 * Get validate method of a field with given name. the returned function could possibly do nothing if the field is not found.
 * The reason could be that the field is not rendered yet or the name given is wrong.
 * @param name
 */
export function useFieldValidate(name?: FieldName): () => void {
  const currentFieldModel = useContext(FieldModelContext);
  const formModel = useFormModel();

  return useCallback(() => {
    const fieldModel = name ? formModel.getField(name!) : currentFieldModel;
    fieldModel?.validate();
  }, [currentFieldModel]);
}
