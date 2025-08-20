/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { forwardRef } from 'react';

import { nanoid } from 'nanoid';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorSpecialConfig } from '../../types';
import { disableFixIndexFormatter, emptyKeyFormatter } from './formatter';
import { SUFFIX, COMPONENT_ID_PREFIX } from './common';

const genNewTypeSchema = <TypeSchema extends Partial<IJsonSchema>>(
  index: number
): [string, TypeSchema] => {
  const newKey = genEmptyKey();

  return [
    newKey,
    {
      type: 'string',
      extra: {
        index,
      },
    } as TypeSchema,
  ];
};

const traverseIJsonSchema = <TypeSchema extends Partial<IJsonSchema>>(
  root: TypeSchema | undefined,
  cb: (type: TypeSchema) => void
): void => {
  if (root) {
    cb(root);

    if (root.items) {
      traverseIJsonSchema(root.items as TypeSchema, cb);
    }
    if (root.additionalProperties) {
      traverseIJsonSchema(root.additionalProperties as TypeSchema, cb);
    }

    if (root.properties) {
      Object.values(root.properties).forEach((v) => {
        traverseIJsonSchema(v as TypeSchema, cb);
      });
    }
  }
};

export const jsonParse = (jsonString?: string) => {
  try {
    return JSON.parse(jsonString || '');
  } catch (error) {
    // todo 兼容错误形态JSON
    return undefined;
  }
};

const sortProperties = <TypeSchema extends Partial<IJsonSchema>>(typeSchema: TypeSchema) => {
  const { properties = {} } = typeSchema;
  const originKeys = Object.keys(properties);

  const sortKeys = originKeys.sort(
    (a, b) => (properties[a].extra?.index || 0) - (properties[b].extra?.index || 0)
  );

  for (let i = 0; i < sortKeys.length; i++) {
    const key = sortKeys[i];

    fixFlowIndex(properties[key]);

    properties[key].extra!.index = i;
  }
};

const fixFlowIndex = <TypeSchema extends Partial<IJsonSchema>>(type: TypeSchema, idx = 0): void => {
  if (!type) {
    return;
  }

  if (!type.extra) {
    type.extra = {};
  }

  if (type.extra.index === undefined) {
    type.extra.index = idx;
  }
};

const getInitialSchema = <TypeSchema extends Partial<IJsonSchema>>(): TypeSchema => {
  const res: IJsonSchema = {
    type: 'object',
    properties: {},
  };
  return res as TypeSchema;
};

const clone = <T>(val: T): T => (val ? JSON.parse(JSON.stringify(val)) : val);

const isTempState = <TypeSchema extends Partial<IJsonSchema>>(
  type: TypeSchema,
  customValidateName?: (value: string) => string
): boolean => {
  let error = false;

  traverseIJsonSchema(type, (c) => {
    if (c.properties) {
      Object.keys(c.properties).forEach((key) => {
        const res = isEmptyKey(key) || customValidateName?.(key);
        if (res) {
          error = true;
        }
      });
    }
  });

  return error;
};

const genEmptyKey = () => SUFFIX + nanoid();

const isEmptyKey = (key: string) => key.startsWith(SUFFIX);

const formateKey = (key: string) => (isEmptyKey(key) ? '' : key);

const deFormateKey = (key: string, originKey?: string) => (!key ? originKey || genEmptyKey() : key);

const formateTypeSchema = <TypeSchema extends Partial<IJsonSchema>>(
  typeSchema: TypeSchema,
  config: TypeEditorSpecialConfig<TypeSchema>
): TypeSchema => {
  const newSchema = JSON.parse(JSON.stringify(typeSchema));

  const formatters = [emptyKeyFormatter];
  if (config.disableFixIndex) {
    formatters.push(disableFixIndexFormatter);
  }

  traverseIJsonSchema(newSchema, (type) => {
    formatters.forEach((formatter) => {
      formatter(type);
    });
  });

  return newSchema;
};

const valueToTypeSchema = <TypeSchema extends Partial<IJsonSchema>>(value: unknown): TypeSchema => {
  // return

  switch (typeof value) {
    case 'string': {
      return {
        type: 'string',
      } as TypeSchema;
    }
    case 'bigint':
    case 'number': {
      return {
        type: 'number',
      } as TypeSchema;
    }
    case 'boolean': {
      return {
        type: 'boolean',
      } as TypeSchema;
    }
    case 'object': {
      if (value) {
        if (Array.isArray(value)) {
          return {
            type: 'array',
            items: valueToTypeSchema(value[0]),
          } as TypeSchema;
        } else {
          const object: IJsonSchema = {
            type: 'object',
            properties: {},
          };
          Object.keys(value).forEach((k) => {
            object.properties![k] = valueToTypeSchema((value as any)[k]);
          });
          return object as TypeSchema;
        }
      }
      break;
    }
    default:
      break;
  }
  return { type: 'string' } as TypeSchema;
};

export const typeEditorUtils = {
  genNewTypeSchema,
  sortProperties,
  traverseIJsonSchema,
  fixFlowIndex,
  genEmptyKey,
  jsonParse,
  clone,
  formateTypeSchema,
  isTempState,
  valueToTypeSchema,
  deFormateKey,
  formateKey,
  getInitialSchema,
};

export function fixedTSForwardRef<T, P = object>(
  render: (props: P, ref: React.Ref<T>) => JSX.Element
): (props: P & React.RefAttributes<T>) => JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return forwardRef(render as any) as any;
}

export const getComponentId = (id: string): string => `${COMPONENT_ID_PREFIX}-${id}`;
