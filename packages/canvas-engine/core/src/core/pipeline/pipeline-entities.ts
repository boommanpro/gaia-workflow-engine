/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  // type AbleRegistry,
  type ConfigEntity,
  type Entity,
  type EntityData,
  type EntityManager,
  type EntityRegistry,
} from '../../common';

/**
 * 注入到 Layer 中的实体选择器
 */
export interface PipelineEntities extends Iterable<Entity> {
  /**
   * 获取单个实体，如果该实体是单例且被注册过，则会自动创建
   * @param registry
   */
  get<T extends Entity>(registry: EntityRegistry, id?: string): T | undefined;
  /**
   * 获取多个实体
   * @param registry
   */
  getEntities<T extends Entity>(registry: EntityRegistry): T[];

  // /**
  //  * 通过 Able 获取多个实体
  //  * @param registry
  //  */
  // getEntitiesByAble<T extends Entity>(registry: AbleRegistry): T[];
  // /**
  //  * 通过多个 Ables 获取多个实体
  //  * @param andAbles - 多个 able，条件且
  //  * @param orAbles - 多个 able，条件或
  //  */
  // getEntitiesByAbles<T extends Entity>(andAbles: AbleRegistry[], orAbles?: AbleRegistry[]): T[];

  /**
   * 获取 entity
   * @param entityRegistry
   * @param dataRegistry
   */
  getEntityDatas<T extends EntityData>(entityRegistry: EntityRegistry, dataRegistry: T): T[];
  /**
   * 是否存在
   * @param registry
   */
  has(registry: EntityRegistry): boolean;
  /**
   * 获取配置信息
   * @param registry
   */
  getConfig<E extends ConfigEntity>(registry: EntityRegistry): E['config'] | undefined;
  /**
   * 更新配置数据
   */
  updateConfig<E extends ConfigEntity>(registry: EntityRegistry, props: Partial<E['config']>): void;

  /**
   * 创建实体
   */
  createEntity: <E extends Entity>(
    registry: EntityRegistry,
    opts?: Omit<E['__opts_type__'], 'entityManager'>,
  ) => E;
  /**
   * 批量删除实体
   */
  removeEntities: (registry: EntityRegistry) => void;
  /**
   * 当前画布订阅的实体数目
   */
  readonly size: number;
}

export class PipelineEntitiesImpl implements PipelineEntities {
  protected observeEntities: Entity[] = [];

  protected observeDatas: EntityData[] = [];

  // @Action 这里要加多个缓存的原因是，每次 decorator 触发都会频繁调用获取方法，"this.xxx" 也会触发 decorator 方法
  protected entitiesTypeCache: Map<EntityRegistry, Entity[]> = new Map();

  protected entitiesAbleCache: Map<string, Entity[]> = new Map();

  protected entitiyDataCache: Map<string, EntityData[]> = new Map();

  constructor(protected readonly entityManager: EntityManager) {}

  get size(): number {
    return this.observeEntities.length;
  }

  /**
   * 加载订阅数据，会缓存到 layer 内部，layer 只能拿到订阅数据的子集
   * @param observeEntites
   * @param observeDatas
   */
  load(observeEntites: Entity[], observeDatas: EntityData[]): void {
    this.observeEntities = observeEntites;
    this.observeDatas = observeDatas;
    // clear cache
    this.entitiesTypeCache.clear();
    this.entitiesAbleCache.clear();
    this.entitiyDataCache.clear();
  }

  get<T extends Entity>(registry: EntityRegistry, id?: string): T | undefined {
    const entities = this.getEntities(registry) as T[];
    if (id !== undefined) {
      return entities.find(e => e.id === id);
    }
    return entities[0];
  }

  has(registy: EntityRegistry): boolean {
    return !!this.get(registy);
  }

  getEntities<T extends Entity>(registry: EntityRegistry): T[] {
    let result = this.entitiesTypeCache.get(registry) as T[];
    // 缓存查询结果
    if (!result) {
      result = [];
      this.observeEntities.forEach(e => {
        if (e.type === registry.type) result!.push(e as T);
      });
      this.entitiesTypeCache.set(registry, result);
    }
    // 可能会出现延迟更新
    return result.filter(r => !r.disposed);
  }

  getEntityDatas<T extends EntityData = EntityData>(
    entityRegistry: EntityRegistry,
    dataRegistry: T,
  ): T[] {
    const dataKey = `${entityRegistry.type}:${dataRegistry.type}`;
    let result = this.entitiyDataCache.get(dataKey) as T[];
    if (result) {
      return result;
    }
    result = this.observeDatas.filter(
      data => data.type === dataRegistry.type && data.entity.type === entityRegistry.type,
    ) as T[];
    this.entitiyDataCache.set(dataKey, result);
    return result;
  }

  // getEntitiesByAble<T extends Entity = Entity>(able: AbleRegistry): T[] {
  //   return this.getEntitiesByAbles([able]);
  // }

  // getEntitiesByAbles<T extends Entity = Entity>(
  //   andAbles: AbleRegistry[] = [],
  //   orAbles: AbleRegistry[] = [],
  // ): T[] {
  //   const ableKey = `${andAbles.map(a => a.type).join(':')}_${orAbles.map(a => a.type).join(':')}`;
  //   let result = this.entitiesAbleCache.get(ableKey) as T[];
  //   // 缓存查询结果
  //   if (!result) {
  //     result = [];
  //     this.observeEntities.forEach(entity => {
  //       const checkAnd = andAbles.length === 0 || !andAbles.find(able => !entity.ables.has(able));
  //       const checkOr = orAbles.length === 0 || orAbles.find(able => entity.ables.has(able));
  //       if (checkAnd && checkOr) {
  //         result.push(entity as T);
  //       }
  //     });
  //     this.entitiesAbleCache.set(ableKey, result);
  //   }
  //   // 可能会出现延迟更新
  //   return result.filter(r => !r.disposed);
  // }

  updateConfig<E extends ConfigEntity>(
    registry: EntityRegistry,
    props: Partial<E['config']>,
  ): void {
    const entity = this.get(registry) as ConfigEntity;
    /* v8 ignore next 3 */
    if (entity && entity.updateConfig) {
      entity.updateConfig(props);
    }
  }

  getConfig<E extends ConfigEntity>(registry: EntityRegistry): E['config'] | undefined {
    const entity = this.get(registry) as ConfigEntity;
    /* v8 ignore next 3 */
    if (entity) {
      return entity.config;
    }
  }

  /**
   * 创建实体
   */
  createEntity<E extends Entity>(
    registry: EntityRegistry,
    opts?: Omit<E['__opts_type__'], 'entityManager'>,
  ): E {
    return this.entityManager.createEntity<E>(registry, opts);
  }

  /**
   * 批量删除实体
   */
  removeEntities(registry: EntityRegistry): void {
    this.entityManager.removeEntities(registry);
  }

  [Symbol.iterator](): Iterator<Entity> {
    let index = 0;
    const len = this.observeEntities.length;
    return {
      next: () => {
        const current = index++;
        const done = current === len;
        return {
          value: this.observeEntities[current],
          done,
        };
      },
    };
  }
}
