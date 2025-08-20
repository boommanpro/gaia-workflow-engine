/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useLayoutEffect } from 'react';

import { EntityData } from '../common';
import { EntityDataRegistry, EntityManager } from '../';
import { useRefresh } from './use-refresh';
// 循环引用会导致单测访问不到 usePlaygroundContainer，这里改正路径。
import { usePlaygroundContainer } from './use-playground-container';
import { useEntityFromContext } from './use-entity-from-context';

/**
 * 从上下 PlaygroundEntityContext 获取 entity data 并监听变化 (默认不监听)
 *
 * */
export function useEntityDataFromContext<T extends EntityData>(
  dataRegistry: EntityDataRegistry<any>,
  listenChange = false,
): T {
  const entityManager = usePlaygroundContainer().get(EntityManager);
  const entityData = useEntityFromContext().getData<T>(dataRegistry)!;
  if (!entityData) {
    throw new Error(
      `[useEntityDataFromContext] Unknown entity Data ${dataRegistry.name} from "PlaygroundEntityContext".`,
    );
  }
  const refresh = useRefresh(entityData.version);
  useLayoutEffect(() => {
    const dispose = entityData.onDataChange(() => {
      if (listenChange) refresh(entityData.version);
    });
    return () => dispose.dispose();
  }, [entityManager, refresh, entityData, listenChange]);
  return entityData;
}
