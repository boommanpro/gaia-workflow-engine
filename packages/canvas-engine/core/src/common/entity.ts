/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { interfaces } from 'inversify';
import { Compare, Disposable, DisposableCollection, Emitter, type Event } from '@flowgram.ai/utils';

import { type PlaygroundContext } from './playground-context';
import type { EntityManager } from './entity-manager';
import type { EntityData, EntityDataProps, EntityDataRegistry } from './entity-data';
// import type { AbleChangedEvent, EntityAbles } from './entity-ables';
// import type { AbleManager } from './able-manager';
// import type { Able, AbleRegistry } from './able';

/**
 * 注册类
 */
export interface EntityRegistry<E extends Entity = Entity> {
  new (opts: any): E;

  readonly type: E['type'];
}

/**
 * 持久化数据
 */
export interface EntityJSON {
  type: string;
  id: string;
  // ableList?: string[];
  dataList: object[];
}

// eslint-disable-next-line no-proto
const ObjectProto = (Object as any).__proto__;

export interface EntityDataChangedEvent<T extends Entity = Entity> {
  type: 'add' | 'delete' | 'update';
  data: EntityData;
  entity: T;
}

export interface EntityOpts {
  entityManager: EntityManager;
  id?: string;
  // ables?: AbleRegistry[]; // 添加的 able
  datas?: { registry: EntityDataRegistry; data?: EntityDataProps<any> }[];
  savedInManager?: boolean; // 是否存储到 manager 上，默认 true
}

let _version = 0;

export class Entity<OPTS extends EntityOpts = EntityOpts> implements Disposable {
  static type = 'Entity';

  private readonly onEntityChangeEmitter = new Emitter<Entity>();

  private readonly onDataChangeEmitter = new Emitter<EntityDataChangedEvent>();

  private readonly initializeDataKeys: string[] = []; // 初始化的

  protected readonly dataManager: Map<string, EntityData> = new Map(); // 存储的数据

  // readonly onBeforeAbleDispatchedEmitter = new Emitter<Able>();
  //
  // readonly onAfterAbleDispatchedEmitter = new Emitter<Able>();

  /**
   * 销毁事件管理
   */
  readonly toDispose = new DisposableCollection();

  /**
   * 销毁前事件管理
   */
  readonly preDispose = new DisposableCollection();

  // /**
  //  * able 管理
  //  */
  // readonly ables: EntityAbles;

  /**
   * 修改会触发
   */
  readonly onEntityChange = this.onEntityChangeEmitter.event;

  // /**
  //  * able 触发之前
  //  */
  // readonly onBeforeAbleDispatched = this.onBeforeAbleDispatchedEmitter.event;

  // /**
  //  * able 触发之后
  //  */
  // readonly onAfterAbleDispatched = this.onAfterAbleDispatchedEmitter.event;

  /**
   * 数据更改事件
   */
  readonly onDataChange = this.onDataChangeEmitter.event;

  // /**
  //  * able 数据更改
  //  */
  // readonly onAbleChange: Event<AbleChangedEvent>;

  // /**
  //  * 默认初始化的 Able
  //  */
  // getDefaultAbleRegistries(): AbleRegistry[] {
  //   return [];
  // }

  /**
   * 默认初始化的 Data
   */
  getDefaultDataRegistries(): EntityDataRegistry[] {
    return [];
  }

  private _changeLockedTimes = 0;

  protected isInitialized = true;

  private _id: string;

  private _version: number = _version++; // 每次创建都有一个新 version，避免 id 相同的 entity 频繁创建销毁导致碰撞

  private _savedInManager = true;

  // readonly ableManager: AbleManager;

  /**
   * 暂停更新开关
   * @protected
   */
  protected get changeLocked(): boolean {
    return this._changeLockedTimes > 0;
  }

  protected set changeLocked(changeLocked) {
    this._changeLockedTimes = changeLocked
      ? this._changeLockedTimes + 1
      : this._changeLockedTimes - 1;

    /* istanbul ignore next */
    if (this._changeLockedTimes < 0) this._changeLockedTimes = 0;
  }

  /**
   * 实体类型
   */
  get type(): string {
    if (!(this.constructor as any).type) {
      throw new Error(`Entity Registry need a type: ${this.constructor.name}`);
    }
    return (this.constructor as any).type;
  }

  /**
   * 全局的entity管理器
   */
  readonly entityManager: EntityManager;

  get context(): PlaygroundContext {
    return this.entityManager.context;
  }

  constructor(opts: OPTS) {
    this.entityManager = opts.entityManager;
    this._id = opts.id || nanoid();
    this._savedInManager = opts.savedInManager === undefined ? true : opts.savedInManager;
    // this.ableManager = this.entityManager.ableManager;
    // this.context = this.entityManager.context;
    this.isInitialized = true;
    // this.ables = this.entityManager.ableManager.createAbleMap(this);
    // this.ables.onAbleChange(event => {
    //   // 只需要监听删除，add 和 update 都由 entityData 去监听
    //   if (event.type === 'delete') {
    //     this.fireChange();
    //   }
    // });
    this.toDispose.push(this.onEntityChangeEmitter);
    // this.toDispose.push(this.onBeforeAbleDispatchedEmitter);
    // this.toDispose.push(this.onAfterAbleDispatchedEmitter);
    this.toDispose.push(this.onDataChangeEmitter);
    // this.toDispose.push(this.ables);
    // this.onAbleChange = this.ables.onAbleChange;
    this.register();
    // if (opts.ables) {
    //   opts.ables.forEach(able => this.ables.add(able));
    // }
    if (opts.datas) {
      opts.datas.forEach((data) => this.addData(data.registry, data.data));
    }
    this.isInitialized = false;
  }

  addInitializeData(datas: EntityDataRegistry[], dataConfig?: any) {
    this.isInitialized = true;
    datas.forEach((data) => this.addData(data, dataConfig));
    this.isInitialized = false;
  }

  /**
   * 实体的版本
   */
  get version(): number {
    return this._version;
  }

  /**
   * 存储数据，用于持久化存储
   */
  toJSON(): EntityJSON | any {
    const dataList: object[] = [];
    for (const data of this.dataManager.values()) {
      dataList.push({
        type: data.type,
        data: data.toJSON(),
      });
    }
    return {
      type: this.type,
      id: this.id,
      // ableList: this.ables.toJSON(),
      dataList,
    };
  }

  /**
   * 还原数据
   */
  fromJSON(data?: EntityJSON | any): void {
    if (!data || !data.id || !data.type) return;
    this.changeLocked = true;
    this.reset();
    if (data.dataList) {
      data.dataList.forEach((d: any) => {
        const registry = this.entityManager.getDataRegistryByType(d.type);
        if (registry) {
          const dataEntity = this.addData(registry);
          dataEntity.update(d.data);
        }
      });
    }
    this.changeLocked = false;
    this.fireChange();
  }

  /**
   * 实体 id
   */
  get id(): string {
    return this._id;
  }

  /**
   * 销毁实体
   */
  dispose(): void {
    this.preDispose.dispose();
    this.toDispose.dispose();
  }

  get disposed(): boolean {
    return this.toDispose.disposed;
  }

  /**
   * 重制为初始化状态
   */
  reset(): void {
    this.changeLocked = true;
    for (const data of this.dataManager.values()) {
      if (!this.initializeDataKeys.includes(data.type)) {
        data.dispose();
      }
    }
    // this.ables.reset();
    this.register();
    this.changeLocked = false;
    this.fireChange();
  }

  /**
   * 销毁事件
   */
  get onDispose(): Event<void> {
    return this.toDispose.onDispose;
  }

  /**
   * 触发实体更新
   * @protected
   */
  protected fireChange(): void {
    if (this.changeLocked || this.isInitialized || this.disposed) return;
    this._version++;
    /* istanbul ignore next */
    if (this._version >= Number.MAX_SAFE_INTEGER) {
      this._version = 0;
    }
    this.onEntityChangeEmitter.fire(this);
  }

  /**
   * 添加数据
   */
  addData<D extends EntityData>(
    Registry: EntityDataRegistry,
    defaultProps?: EntityDataProps<D>
  ): D {
    this.entityManager.registerEntityData(Registry);
    let entityData = this.dataManager.get(Registry.type) as D;

    if (entityData) {
      if (defaultProps) this.updateData(Registry, defaultProps);
      return entityData;
    }

    // 是否存在EntityData依赖注入器
    const injector = this.entityManager.getDataInjector(Registry);
    entityData = new Registry(this, injector?.()) as D;

    if (this.isInitialized) this.initializeDataKeys.push(entityData.type);
    this.dataManager.set(Registry.type, entityData);
    this.toDispose.push(entityData);
    entityData.onDataChange(() => {
      const event: EntityDataChangedEvent = {
        type: 'update',
        data: entityData,
        entity: this,
      };
      this.onDataChangeEmitter.fire(event);
      this.fireChange();
    });
    entityData.toDispose.push(
      Disposable.create(() => {
        // 初始化的 data 数据无法被删除
        if (!this.initializeDataKeys.includes(Registry.type)) {
          this.dataManager.delete(Registry.type);
        }
        const event: EntityDataChangedEvent = {
          type: 'delete',
          data: entityData,
          entity: this,
        };
        this.onDataChangeEmitter.fire(event);
        this.fireChange();
      })
    );
    entityData.changeLocked = true;
    this.updateData(Registry, defaultProps || entityData.getDefaultData());
    entityData.changeLocked = false;
    const event: EntityDataChangedEvent = {
      type: 'add',
      data: entityData,
      entity: this,
    };
    this.onDataChangeEmitter.fire(event);
    return entityData;
  }

  /**
   * 是否存到全局 manager，默认 true
   */
  get savedInManager(): boolean {
    return this._savedInManager;
  }

  /**
   * 更新实体的数据
   */
  updateData<D extends EntityData>(
    Registry: EntityDataRegistry<D>,
    props: EntityDataProps<D>
  ): void {
    const entityData = this.dataManager.get(Registry.type);
    if (entityData) {
      entityData.update(props);
    }
  }

  /**
   * 获取 data 数据
   */
  getData<D extends EntityData>(Registry: EntityDataRegistry<D>): D {
    return this.dataManager.get(Registry.type) as D;
  }

  /**
   * 是否有指定数据
   */
  hasData(Registry: EntityDataRegistry): boolean {
    return this.dataManager.has(Registry.type);
  }

  /**
   * 删除数据，初始化状态注入的数据无法被删除
   */
  removeData<D extends EntityData>(Registry: EntityDataRegistry<D>): void {
    // 初始化的数据无法被删除
    if (this.initializeDataKeys.includes(Registry.type)) return;
    const entityData = this.dataManager.get(Registry.type);
    if (entityData) {
      entityData.dispose();
    }
  }

  /**
   * 获取 IOC 服务
   * @param identifier
   */
  getService<T>(identifier: interfaces.ServiceIdentifier<T>): T {
    return this.entityManager.getService<T>(identifier);
  }
  // /**
  //  * 添加 able
  //  */
  // addAbles(...ables: AbleRegistry[]): void {
  //   ables.forEach(able => this.ables.add(able));
  // }
  //
  // /**
  //  * 删除 able
  //  */
  // removeAbles(...ables: AbleRegistry[]): void {
  //   ables.forEach(able => this.ables.remove(able));
  // }
  //
  // /**
  //  * 是否有 able
  //  */
  // hasAble(able: AbleRegistry): boolean {
  //   return this.ables.has(able);
  // }
  //
  // hasAbles(...ables: AbleRegistry[]): boolean {
  //   for (const able of ables) {
  //     if (!this.ables.has(able)) return false;
  //   }
  //   return true;
  // }

  protected register(): void {
    // 注册默认 able
    // this.getDefaultAbleRegistries().forEach(Registry => this.ables.add(Registry));
    // 注册默认 data
    this.getDefaultDataRegistries().forEach((Registry) => this.addData(Registry));
  }

  declare __opts_type__: OPTS;
}

export namespace Entity {
  export function getType(registry: EntityRegistry): string {
    return registry.type;
  }

  /**
   * 默认数据比较，采用浅比较
   */
  export function checkDataChanged(oldProps: any, newProps: any): boolean {
    return Compare.isChanged(oldProps, newProps);
  }

  export function isRegistryOf(target: any, Registry: any): boolean {
    if (target === Registry) return true;
    // eslint-disable-next-line no-proto
    let proto = target.__proto__;
    while (proto && proto !== ObjectProto) {
      if (proto.prototype === Registry.prototype) return true;
      // eslint-disable-next-line no-proto
      proto = proto.__proto__;
    }
    return false;
  }
}
