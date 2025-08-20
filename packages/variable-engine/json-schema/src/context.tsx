/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { createContext, useContext, useMemo } from 'react';

import { usePlaygroundContainer } from '@flowgram.ai/core';

import {
  IJsonSchema,
  jsonSchemaTypeManager,
  JsonSchemaTypeManager,
  JsonSchemaTypeRegistry,
} from './json-schema';
import { BaseTypeManager, TypeRegistryCreator } from './base';

// use global default
const TypePresetContext = createContext<JsonSchemaTypeManager | null>(null);

export const useTypeManager = () => {
  const typeManagerFromContext = useContext(TypePresetContext);
  const container = usePlaygroundContainer();

  if (typeManagerFromContext) {
    return typeManagerFromContext;
  }

  if (container?.isBound?.(BaseTypeManager)) {
    return container.get(BaseTypeManager);
  }

  // Global Singleton
  return jsonSchemaTypeManager;
};

export const TypePresetProvider = <
  Registry extends JsonSchemaTypeRegistry = JsonSchemaTypeRegistry
>({
  children,
  types,
}: React.PropsWithChildren<{
  types: (
    | Partial<Registry>
    | TypeRegistryCreator<IJsonSchema, Registry, JsonSchemaTypeManager<IJsonSchema, Registry>>
  )[];
}>) => {
  const schemaManager = useMemo(() => {
    const typeManager = new JsonSchemaTypeManager<IJsonSchema, Registry>();

    types.forEach((_type) => typeManager.register(_type));

    return typeManager;
  }, [...types]);

  return (
    <TypePresetContext.Provider value={schemaManager as unknown as JsonSchemaTypeManager}>
      {children}
    </TypePresetContext.Provider>
  );
};
