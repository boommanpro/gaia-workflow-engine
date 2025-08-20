/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';

import { BaseTypeRegistry, TypeRegistryCreator } from './types';

@injectable()
export abstract class BaseTypeManager<
  Schema,
  Registry extends BaseTypeRegistry,
  Manager extends BaseTypeManager<Schema, Registry, Manager>
> {
  protected typeRegistryMap: Map<string, Registry> = new Map();

  protected onTypeRegistryChangeEmitter = new Emitter<Registry[]>();

  public onTypeRegistryChange = this.onTypeRegistryChangeEmitter.event;

  /**
   * 获取 typeSchema 对应的 type
   * 不能直接访问 type 的原因的是
   * Schema 中 type 可能为空，需要获取 $ref 中的 type
   */
  protected abstract getTypeNameFromSchema(typeSchema: Schema): string;

  getTypeByName(typeName: string): Registry | undefined {
    return this.typeRegistryMap.get(typeName);
  }

  getTypeBySchema(type: Schema): Registry | undefined {
    const key = this.getTypeNameFromSchema(type);
    return this.typeRegistryMap.get(key);
  }

  getDefaultTypeRegistry(): Registry | undefined {
    return this.typeRegistryMap.get('default');
  }

  /**
   * 注册 TypeRegistry
   */
  register(
    originRegistry: Partial<Registry> | TypeRegistryCreator<Schema, Registry, Manager>
  ): void {
    const registry =
      typeof originRegistry === 'function'
        ? originRegistry({ typeManager: this as unknown as Manager })
        : originRegistry;

    const type = registry.type;
    if (!type) {
      return;
    }

    let originTypeRegistry = this.getTypeByName(type);

    let extendTypeRegistry = registry.extend
      ? this.getTypeByName(registry.extend)
      : this.getDefaultTypeRegistry();

    if (originTypeRegistry) {
      // 如果是重复注册的类型，进行 merge
      this.typeRegistryMap.set(type, {
        ...extendTypeRegistry,
        ...originTypeRegistry,
        ...registry,
      });
    } else {
      this.typeRegistryMap.set(type, {
        ...extendTypeRegistry,
        ...registry,
      } as Registry);
    }
  }

  triggerChanges() {
    this.onTypeRegistryChangeEmitter.fire(Array.from(this.typeRegistryMap.values()));
  }

  /**
   * 获取全量的 TypeRegistries
   */
  public getAllTypeRegistries(): Registry[] {
    return Array.from(this.typeRegistryMap.values());
  }

  unregister(type: string): void {
    this.typeRegistryMap.delete(type);
  }
}
