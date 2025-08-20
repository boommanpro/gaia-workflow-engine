/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { typeEditorUtils } from '../utils';
import { type ModeValueConfig } from '../type';
import { TypeEditorColumnType } from '../../../types';

export const typeDefinitionConfig: ModeValueConfig<'type-definition', IJsonSchema> = {
  mode: 'type-definition',
  convertSchemaToValue: (val) => val,
  convertValueToSchema: (val) => val,
  commonValueToSubmitValue: (val) => {
    if (val) {
      return typeEditorUtils.valueToTypeSchema(val);
    }
    return {
      type: 'object',
      properties: {},
    };
  },

  toolConfig: {
    createByData: {
      viewConfig: [
        {
          type: TypeEditorColumnType.Key,
          visible: true,
        },
        {
          type: TypeEditorColumnType.Type,
          visible: true,
        },
      ],
      genDefaultValue() {
        return {
          type: 'object',
          properties: {},
        };
      },
    },
  },
};
