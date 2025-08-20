/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorColumnType, TypeEditorRowData } from '../../../types';

export const useDisabled = <TypeSchema extends Partial<IJsonSchema>>(
  type: TypeEditorColumnType,
  rowData: TypeEditorRowData<TypeSchema>
): string | undefined => {
  const disabled = (rowData.disableEditColumn || []).find((r) => r.column === type);

  if (disabled?.reason) {
    return disabled?.reason;
  }

  if (typeof rowData.extra?.editable === 'string') {
    return rowData.extra?.editable;
  }

  return rowData.extra?.editable === false ? `${type}  is not editable.` : undefined;
};
