/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { Container, interfaces } from 'inversify';
import { IJsonSchema, JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';

import {
  getTypeDefinitionAdapter,
  ITypeDefinitionAdapter,
  registryFormatter,
} from '../utils/registry-adapter';
import { TypeEditorRegistry } from '../types';
import { defaultTypeRegistryCreators } from '../type-registry';
import { TypeEditorRegistryManager } from '../services/type-registry-manager';
import {
  ClipboardService,
  ShortcutsService,
  TypeEditorOperationService,
  TypeEditorService,
} from '../services';

export type TypeRegistryCreatorsAdapter<TypeSchema extends Partial<IJsonSchema>> = (
  param: Parameters<JsonSchemaTypeRegistryCreator<TypeSchema, TypeEditorRegistry<TypeSchema>>>[0] &
    ITypeDefinitionAdapter<TypeSchema>
) => ReturnType<JsonSchemaTypeRegistryCreator<TypeSchema, TypeEditorRegistry<TypeSchema>>>;

export const TypeEditorContext = createContext<{
  /**
   * @deprecated
   */
  typeRegistryCreators?: TypeRegistryCreatorsAdapter<IJsonSchema>[];
}>({});

interface Context {
  container: Container;
}

const TypeContext = createContext<Context>({
  container: new Container(),
});

export function useService<T>(identifier: interfaces.ServiceIdentifier): T {
  const container = useContext(TypeContext).container;

  return container.get(identifier) as T;
}

export const TypeEditorProvider = <TypeSchema extends Partial<IJsonSchema>>({
  children,
  typeRegistryCreators = [],
  onInit,
}: Parameters<
  React.FunctionComponent<{
    children: JSX.Element;
    onInit?: () => void;
    typeRegistryCreators?: TypeRegistryCreatorsAdapter<TypeSchema>[];
  }>
>[0]) => {
  const container = useMemo(() => {
    const res = new Container();

    res.bind(TypeEditorService).toSelf().inSingletonScope();
    res.bind(TypeEditorOperationService).toSelf().inSingletonScope();
    res.bind(TypeEditorRegistryManager).toSelf().inSingletonScope();
    res.bind(ShortcutsService).toSelf().inSingletonScope();
    res.bind(ClipboardService).toSelf().inSingletonScope();

    return res;
  }, []);

  useEffect(() => {
    const typeManager =
      container.get<TypeEditorRegistryManager<TypeSchema>>(TypeEditorRegistryManager);

    [...defaultTypeRegistryCreators].forEach((creator) => {
      typeManager.register(
        creator as unknown as JsonSchemaTypeRegistryCreator<
          TypeSchema,
          TypeEditorRegistry<TypeSchema>
        >
      );
    });
  }, [container]);

  useEffect(() => {
    const typeManager =
      container.get<TypeEditorRegistryManager<TypeSchema>>(TypeEditorRegistryManager);

    const adapter = getTypeDefinitionAdapter(typeManager);

    typeRegistryCreators.forEach((creator) => {
      typeManager.register(creator({ typeManager, ...adapter }));
    });

    typeManager.getAllTypeRegistries().forEach((registry) => {
      const res = registryFormatter(registry, typeManager);
      typeManager.register(res);
    });

    typeManager.triggerChanges();
    onInit?.();
  }, [typeRegistryCreators, onInit, container]);

  return <TypeContext.Provider value={{ container }}>{children}</TypeContext.Provider>;
};

export const useTypeDefinitionManager = <TypeSchema extends Partial<IJsonSchema>>() =>
  useService<TypeEditorRegistryManager<TypeSchema>>(TypeEditorRegistryManager);
