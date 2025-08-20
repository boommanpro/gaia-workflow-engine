/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */
import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Space, Typography } from '@douyinfe/semi-ui';

import { TypeEditorRegistry } from '../types';
import { TypeEditorRegistryManager } from '../services/type-registry-manager';

export const registryFormatter = <TypeSchema extends Partial<IJsonSchema>>(
  registry: Partial<TypeEditorRegistry<TypeSchema>>,
  manager: TypeEditorRegistryManager<TypeSchema>
): Partial<TypeEditorRegistry<TypeSchema>> => {
  const res: Record<string, unknown> = {
    ...registry,
  };

  const apiMap: Record<string, string> = {
    getItemTypes: 'getSupportedItemTypes',
    getIJsonSchemaByStringValue: 'getTypeSchemaByStringValue',
    getStringValue: 'getStringValueByTypeSchema',
    getIJsonSchemaProperties: 'getTypeSchemaProperties',
    getIJsonSchemaPropertiesParent: 'getPropertiesParent',
    getChildrenExtraJsonPaths: 'getJsonPaths',
    getDefaultIJsonSchema: 'getDefaultSchema',
  };

  Object.keys(apiMap).forEach((api) => {
    if (res[api]) {
      res[apiMap[api]] = res[api];
    }
    if (res[apiMap[api]]) {
      res[api] = res[apiMap[api]];
    }
  });

  return {
    ...res,
    getDisplayLabel: (type: IJsonSchema) => (
      <Space style={{ width: '100%' }}>
        {manager?.getDisplayIcon(type as TypeSchema)}
        <div style={{ flex: 1, width: 0, display: 'flex' }}>
          <Typography.Text size="small" ellipsis={{ showTooltip: true }}>
            {manager.getComplexText(type as TypeSchema)}
          </Typography.Text>
        </div>
      </Space>
    ),
    getIJsonSchemaDeepField: (type: TypeSchema) => manager.getTypeSchemaDeepChildField(type),
  } as unknown as TypeEditorRegistry<TypeSchema>;
};

interface ITypeDefinitionManager<TypeSchema extends Partial<IJsonSchema>> {
  getDefinitionByIJsonSchema: (
    typeSchema?: TypeSchema
  ) => TypeEditorRegistry<TypeSchema> | undefined;
  getAllTypeDefinitions: () => TypeEditorRegistry<TypeSchema>[];
  getDefinitionByType: (type: string) => TypeEditorRegistry<TypeSchema> | undefined;
  getUndefinedIJsonSchema: () => TypeSchema;
}

export interface ITypeDefinitionAdapter<TypeSchema extends Partial<IJsonSchema>> {
  /**
   * @deprecated 兼容旧接口，已废弃，请使用 typeRegistryManager
   */
  typeDefinitionManager: ITypeDefinitionManager<TypeSchema>;
  /**
   * @deprecated 兼容旧接口，已废弃，请使用 typeRegistryManager 的 getComplexText 方法
   */
  utils: {
    getComposedLabel: (type: TypeSchema) => string;
  };
}

export const getTypeDefinitionAdapter = <TypeSchema extends Partial<IJsonSchema>>(
  manager: TypeEditorRegistryManager<TypeSchema>
): ITypeDefinitionAdapter<TypeSchema> => {
  const typeDefinitionManager: ITypeDefinitionManager<TypeSchema> = {
    getDefinitionByIJsonSchema: (typeSchema?: TypeSchema) =>
      typeSchema ? manager.getTypeBySchema(typeSchema) : undefined,
    getAllTypeDefinitions: () => manager.getTypeRegistriesWithParentType(),
    getDefinitionByType: (type) => manager.getTypeByName(type),
    getUndefinedIJsonSchema: () => manager.getTypeByName('unknown')!.getDefaultSchema(),
  };

  return {
    typeDefinitionManager,
    utils: {
      getComposedLabel: (type: TypeSchema) => manager.getComplexText(type),
    },
  };
};
