/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Container } from 'inversify'

import {
  // AbleManager,
  Entity,
  EntityManager,
  PlaygroundContext,
} from '../src'

function createContainer(): Container {
  const child = new Container({ defaultScope: 'Singleton' })
  // child.bind(AbleManager).toSelf()
  child.bind(PlaygroundContext).toConstantValue({})
  child.bind(EntityManager).toSelf()
  return child
}

const container = createContainer()
export const entityManager = container.get<EntityManager>(EntityManager)

class TestEntity extends Entity {
  static type = TestEntity.name
}

export function createEntity<T extends Entity>(t = TestEntity, opts: any = {}): T {
  return entityManager.createEntity<T>(t, opts)
}
