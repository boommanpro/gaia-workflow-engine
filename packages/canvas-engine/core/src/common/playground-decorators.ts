/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  // ABLES_DECO_KEY,
  ENTITIES_DECO_KEY,
  // HANDLE_DECO_KEY,
  // PAYLOAD_DECO_KEY,
  createRegistryDecorator,
  ENTITIES_BY_DATA_DECO_KEY,
  type RegistryValueGetter,
} from './playground-decorator-helper';
// import type { AbleRegistry } from './able';
import type { Entity, EntityDataRegistry, EntityRegistry } from '.';
// import type { Layer } from './layer';

// export function observeAble(registry: AbleRegistry): any {
//   const getValue: RegistryValueGetter<Entity[]> = (target: any) =>
//     target.observeManager.getEntitiesByAble(registry);
//   return createRegistryDecorator(ABLES_DECO_KEY, [registry], getValue);
// }

// /**
//  * @param andAbles - 多个 able，条件且
//  * @param orAbles - 多个 able，条件或
//  */
// export function observeAbles(andAbles: AbleRegistry[], orAbles: AbleRegistry[] = []): any {
//   const getValue: RegistryValueGetter<Entity[]> = (target: any) =>
//     target.observeManager.getEntitiesByAbles(andAbles, orAbles);
//   return createRegistryDecorator(ABLES_DECO_KEY, andAbles.concat(orAbles), getValue);
// }
export function observeEntity(registry: EntityRegistry): any {
  const getValue: RegistryValueGetter<Entity> = (target: any) =>
    target.observeManager.get(registry)!;
  return createRegistryDecorator(ENTITIES_DECO_KEY, registry, getValue);
}

/**
 * 监听 entity 变化
 * @param registry
 */
export function observeEntities(registry: EntityRegistry): any {
  const getValue: RegistryValueGetter<Entity[]> = (target: any) =>
    target.observeManager.getEntities(registry);
  return createRegistryDecorator(ENTITIES_DECO_KEY, registry, getValue);
}

// export function payload(payloadKey: string | symbol): any {
//   const check = (target: any, method: string) => {
//     if (method !== 'payload')
//       throw new Error(`@payload() should be used by "payload" method but get "${method}".`);
//   };
//   // @ts-ignore
//   return createRegistryDecorator(PAYLOAD_DECO_KEY, payloadKey, undefined, check);
// }

// export function params(...registries: EntityDataRegistry[]): any {
//   const check = (target: any, method: string) => {
//     if (method !== 'handle')
//       throw new Error(`@params() should be used by "handle" method but get "${method}".`);
//   };
//   // @ts-ignore
//   return createRegistryDecorator(HANDLE_DECO_KEY, registries, undefined, check);
// }

/**
 * 监听 entity 对应的 data 数据变化
 *
 * @param entityRegistry
 * @param dataRegistry
 */
export function observeEntityDatas(
  entityRegistry: EntityRegistry,
  dataRegistry: EntityDataRegistry,
): any {
  const getValue: RegistryValueGetter<Entity[]> = (target: any) =>
    target.observeManager.getEntityDatas(entityRegistry, dataRegistry);
  return createRegistryDecorator(
    ENTITIES_BY_DATA_DECO_KEY,
    { entity: entityRegistry, data: dataRegistry },
    getValue,
  );
}
