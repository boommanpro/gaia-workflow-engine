/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useLayoutEffect } from 'react';

import { Entity, EntityManager, EntityRegistry } from '../common';
import { useRefresh } from './use-refresh';
import { usePlaygroundContainer } from './use-playground-container';

/**
 * 获取 entities 并监听变化
 * @deprecated
 */
export function useEntities<T extends Entity>(entityRegistry: EntityRegistry): T[] {
  const entityManager = usePlaygroundContainer().get(EntityManager);
  const refresh = useRefresh();
  useLayoutEffect(() => {
    const dispose = entityManager.onEntityChange(entityKey => {
      if (entityKey === entityRegistry.type) {
        refresh();
      }
    });
    return () => dispose.dispose();
  }, [entityManager, refresh]);
  return entityManager.getEntities<T>(entityRegistry);
}
