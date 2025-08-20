/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Compare, DisposableImpl, Emitter } from '@flowgram.ai/utils';

import { Entity } from './entity';

/**
 * 实体的数据块
 */
export abstract class EntityData<
  DATA = any | number | string,
  OPTS extends {} = {},
> extends DisposableImpl {
  static type = 'EntityData';

  protected onDataChangeEmitter = new Emitter<EntityData<DATA, OPTS>>();

  protected onWillChangeEmitter = new Emitter<EntityData<DATA, OPTS>>();

  protected _data: DATA;

  private _changeLocked = false;

  protected _version = 0;

  declare entity: Entity;

  /**
   * 修改后触发
   */
  readonly onDataChange = this.onDataChangeEmitter.event;

  /**
   * 修改前触发
   */
  readonly onWillChange = this.onWillChangeEmitter.event;

  /**
   * 初始化数据
   */
  abstract getDefaultData(): DATA;

  constructor(entity: Entity, readonly opts?: OPTS) {
    super();
    this.entity = entity;
    this._data = this.getDefaultData();
    this.toDispose.push(this.onDataChangeEmitter);
    this.toDispose.push(this.onWillChangeEmitter);
  }

  /**
   * data 类型
   */
  get type(): string {
    if (!(this.constructor as any).type) {
      throw new Error(`Entity Data Registry need a type: ${this.constructor.name}`);
    }
    return (this.constructor as any).type;
  }

  /**
   * 当前数据
   */
  get data(): DATA {
    return this._data;
  }

  /**
   * 更新单个数据
   */
  update(props: Partial<DATA> | keyof DATA | DATA, value?: any): void {
    if (arguments.length === 2) {
      if (this._data[props as keyof DATA] !== value) {
        this.fireWillChange();
        this._data[props as keyof DATA] = value;
        this.fireChange();
      }
    } else if (this.checkChanged(props as Partial<DATA>)) {
      this.fireWillChange();
      if (typeof props !== 'object') {
        this._data = props as any;
      } else {
        this._data = { ...this._data, ...(props as Partial<DATA>) };
      }
      this.fireChange();
    }
  }

  /**
   * 更新全量数据
   * @param props
   */
  fullyUpdate(props: DATA): void {
    // 仅做一层的全量比较
    if (Compare.isChanged(this._data, props, 1, false)) {
      this.fireWillChange();
      this._data = props;
      this.fireChange();
    }
  }

  /**
   * @deprecated
   * 检测属性是否更改，默认采用浅比较
   */
  checkChanged(newProps: Partial<DATA> | DATA): boolean {
    return Entity.checkDataChanged(this._data, newProps);
  }

  /**
   * 存储数据，一般在关闭浏览器后需要暂时存到 localStorage
   */
  toJSON(): any {
    return this.data as any;
  }

  /**
   * 还原数据
   */
  fromJSON(data: object): void {
    this.update(data);
  }

  get changeLocked(): boolean {
    return this._changeLocked;
  }

  set changeLocked(p) {
    this._changeLocked = p;
  }

  fireWillChange(): void {
    this.onWillChangeEmitter.fire(this as EntityData<DATA, OPTS>);
  }

  fireChange(): void {
    if (this._changeLocked) return;
    this._version++;
    /* istanbul ignore next */
    if (this._version >= Number.MAX_SAFE_INTEGER) {
      this._version = 0;
    }
    this.onDataChangeEmitter.fire(this as EntityData<DATA, OPTS>);
  }

  protected bindChange(data: EntityData, fn?: () => void): void {
    this.toDispose.push(
      data.onDataChange(() => {
        if (fn) fn();
        this.fireChange();
      }),
    );
  }

  get version() {
    return this._version;
  }
}

export type EntityDataProps<E extends EntityData> = E['data'];

export interface EntityDataRegistry<E extends EntityData = EntityData> {
  new (...args: any[]): E;

  type: E['type'];
}

export type EntityDataInjector = <OPTS extends {} = {}>() => OPTS;
