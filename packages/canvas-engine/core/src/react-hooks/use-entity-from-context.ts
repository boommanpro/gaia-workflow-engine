/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useContext, useLayoutEffect } from 'react';

import { Disposable } from '@flowgram.ai/utils';

import { PlaygroundEntityContext } from '../react';
import { Entity, EntityManager } from '../common';
import { useRefresh } from './use-refresh';
import { usePlaygroundContainer } from './use-playground-container';

/**
 * 从上下 PlaygroundEntityContext 获取 entity 并监听变化(默认不监听)
 */
export function useEntityFromContext<T extends Entity>(listenChange = false): T {
  const entityManager = usePlaygroundContainer().get(EntityManager);
  const entity: T = useContext<T>(PlaygroundEntityContext);
  if (!entity) {
    throw new Error('[useEntityFromContext] Unknown entity from "PlaygroundEntityContext"');
  }
  const refresh = useRefresh(entity.version);
  useLayoutEffect(() => {
    let dispose: Disposable | undefined;
    if (listenChange) {
      dispose = entity.onEntityChange(() => refresh(entity.version));
    }
    return () => dispose?.dispose();
  }, [entityManager, refresh, entity, listenChange]);
  return entity;
}
