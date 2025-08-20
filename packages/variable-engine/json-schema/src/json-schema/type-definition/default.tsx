/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema, JsonSchemaTypeRegistryCreator } from '../types';

export const defaultTypeDefinitionRegistry: JsonSchemaTypeRegistryCreator = ({ typeManager }) => ({
  type: 'default',

  label: '',

  icon: <></>,

  container: false,

  getJsonPaths: () => [],

  getDisplayIcon: (schema): JSX.Element => typeManager.getTypeBySchema(schema)?.icon || <></>,

  getPropertiesParent: () => undefined,

  canAddField: () => false,

  getDefaultValue: () => undefined,

  getValueText: () => '',

  getStringValueByTypeSchema: (type: IJsonSchema): string | undefined => type.type,

  getTypeSchemaProperties: () => undefined,

  getDisplayLabel: (schema) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {typeManager.getTypeBySchema(schema)?.label}
      <span
        style={{
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {typeManager.getComplexText(schema)}
      </span>
    </div>
  ),

  getDisplayText: (type: IJsonSchema) => typeManager.getComplexText(type),
});
