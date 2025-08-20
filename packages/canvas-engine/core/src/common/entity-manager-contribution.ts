/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type EntityManager } from './entity-manager';

export const EntityManagerContribution = Symbol('EntityManagerContribution');

export interface EntityManagerContribution {
  registerEntityManager(entityManager: EntityManager): void;
}
