/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useLayoutEffect } from 'react';

import { Disposable } from '@flowgram.ai/utils';

import { ConfigEntity, EntityManager, EntityRegistry } from '../common';
import { useRefresh } from './use-refresh';
import { usePlaygroundContainer } from './use-playground-container';

/**
 * 获取 config entity
 */
export function useConfigEntity<T extends ConfigEntity>(
  entityRegistry: EntityRegistry<T>,
  listenChange = false,
): T {
  const entityManager = usePlaygroundContainer().get(EntityManager);
  const entity = entityManager.getEntity<T>(entityRegistry, true) as T;
  const refresh = useRefresh(entity.version);
  useLayoutEffect(() => {
    const dispose = listenChange
      ? entity.onEntityChange(() => {
          refresh(entity.version);
        })
      : Disposable.NULL;
    return () => dispose.dispose();
  }, [entityManager, refresh, entity, listenChange]);
  return entity;
}
