/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type Disposable } from '@flowgram.ai/utils';

import type { EntityDataRegistry } from './entity-data';
import { EntityData } from './entity-data';
import { Entity, type EntityOpts } from './entity';

export interface ConfigEntityProps {}

// let version = 0

export function createConfigDataRegistry<P>(entity: ConfigEntity<any>): EntityDataRegistry {
  class ConfigData extends EntityData<P> {
    getDefaultData(): P {
      return entity.getDefaultConfig();
    }

    checkChanged(newProps: Partial<P>): boolean {
      return entity.checkChanged(this.data, newProps);
    }

    toJSON(): object {
      return super.toJSON();
    }
  }

  Object.defineProperty(ConfigData, 'type', {
    value: `_${entity.type}DataMixin`,
    // value: `_${entity.type}DataMixin_${version++}`,
  });

  return ConfigData as any;
}

/**
 * 用于专门的数据配置，且是单例
 */
export class ConfigEntity<
  P extends ConfigEntityProps = ConfigEntityProps,
  O extends EntityOpts = EntityOpts,
> extends Entity<O> {
  static type = 'ConfigEntity';

  protected ConfigDataRegistry: EntityDataRegistry;

  constructor(opts: O) {
    super(opts);
    this.isInitialized = true;
    this.ConfigDataRegistry = createConfigDataRegistry<P>(this);
    this.addData(this.ConfigDataRegistry);
    this.isInitialized = false;
  }

  getDefaultConfig(): P {
    return {} as P;
  }

  /**
   * 判断 config 数据是否变化
   */
  checkChanged(oldData: P, newData: Partial<P>): boolean {
    return Entity.checkDataChanged(oldData, newData);
  }

  get config(): P {
    return this.getData(this.ConfigDataRegistry)!.data as P;
  }

  updateConfig(props: Partial<P>): void {
    this.updateData(this.ConfigDataRegistry, props);
  }

  onConfigChanged(fn: (data: P) => void): Disposable {
    return this.getData<EntityData>(this.ConfigDataRegistry)!.onDataChange(d => fn(d.data as P));
  }
}
