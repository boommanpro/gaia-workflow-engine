/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { set, get } from 'lodash-es';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { typeEditorUtils } from '../utils';
import { type ModeValueConfig } from '../type';
import { TypeEditorColumnType, TypeEditorSchema } from '../../../types';

const traverseIJsonSchema = (
  root: TypeEditorSchema<IJsonSchema> | undefined,
  path: string[],
  cb: (type: TypeEditorSchema<IJsonSchema>, path: string[]) => void
): void => {
  if (root) {
    cb(root, path);

    if (root.properties) {
      Object.keys(root.properties).forEach((k) => {
        traverseIJsonSchema(root.properties![k], [...path, k], cb);
      });
    }
  }
};

export const declareAssignConfig: ModeValueConfig<'declare-assign', IJsonSchema> = {
  mode: 'declare-assign',
  convertSchemaToValue: (val) => {
    const data = {};
    const newSchema = JSON.parse(JSON.stringify(val));

    traverseIJsonSchema(newSchema, [], (type, path) => {
      if (type.extra?.value !== undefined) {
        set(data, path, type.extra?.value);
      }
      if (type.extra) {
        delete type.extra;
      }
    });

    return {
      data,
      definition: { schema: newSchema },
    };
  },
  convertValueToSchema: (schema) => {
    const { data } = schema;
    const newSchema = JSON.parse(JSON.stringify(schema.definition.schema));
    traverseIJsonSchema(newSchema, [], (type, path) => {
      const value = get(data, path);
      if (value !== undefined && type.type !== 'object') {
        type.extra = { value };
      }
    });
    return newSchema;
  },
  commonValueToSubmitValue: (val) => {
    const type: IJsonSchema = val
      ? typeEditorUtils.valueToTypeSchema(val)
      : {
          type: 'object',
          properties: {},
        };
    return {
      data: val || {},
      definition: {
        schema: type,
      },
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
        {
          type: TypeEditorColumnType.Value,
          visible: true,
        },
      ],
      genDefaultValue: () => ({
        data: {},
        definition: {
          schema: {
            type: 'object',
            properties: {},
          },
        },
      }),
    },
  },
};
