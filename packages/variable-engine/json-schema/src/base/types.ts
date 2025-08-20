/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type BaseTypeManager } from './base-type-manager';

/**
 * Base information for TypeRegistry
 */
export interface BaseTypeRegistry {
  /**
   * type reference
   */
  type: string;
  /**
   * The inherited type. If there is an inheritance, the definition of this type will use the inherited type definition,
   * and the new definition will override the inherited definition.
   */
  extend?: string;
}

/**
 * TypeRegistryCreator
 */
export type TypeRegistryCreator<
  Schema,
  Registry extends BaseTypeRegistry,
  Manager extends BaseTypeManager<Schema, Registry, Manager>
> = (ctx: { typeManager: Manager }) => Partial<Registry>;
