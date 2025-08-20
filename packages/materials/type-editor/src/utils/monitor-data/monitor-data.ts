/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Emitter, type Event } from '@flowgram.ai/utils';

/**
 * 定义用于在 service 的一些需要被监听 onChange 的 data
 * 搭配 useMonitorData 使用
 */
export class MonitorData<Type> {
  private _data: Type;

  protected readonly onDataChangeEmitter = new Emitter<{
    prev: Type;
    next: Type;
  }>();

  readonly onDataChange: Event<{
    prev: Type;
    next: Type;
  }> = this.onDataChangeEmitter.event;

  public get data(): Type {
    return this._data;
  }

  public constructor(initialValue?: Type) {
    if (initialValue !== undefined) {
      this._data = initialValue;
    }
  }

  public update(data: Type) {
    const prev = this._data;
    this._data = data;
    this.onDataChangeEmitter.fire({
      prev,
      next: data,
    });
  }
}
