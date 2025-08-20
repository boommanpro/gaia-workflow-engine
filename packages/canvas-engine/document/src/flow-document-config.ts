/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable, optional } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';

export const FlowDocumentConfigDefaultData = Symbol('FlowDocumentConfigDefaultData');

/**
 * 用于文档扩展配置
 */
@injectable()
export class FlowDocumentConfig {
  private onDataChangeEmitter = new Emitter<string>();

  readonly onChange = this.onDataChangeEmitter.event;

  constructor(
    @inject(FlowDocumentConfigDefaultData)
    @optional()
    private _data: Record<string, any> = {},
  ) {}

  get(key: string): any {
    return this._data[key];
  }

  set(key: string, value: any): void {
    if (this.get(key) !== value) {
      this._data[key] = value;
      this.onDataChangeEmitter.fire(key);
    }
  }

  registerConfigs(config: Record<string, any>) {
    Object.keys(config).forEach(key => {
      this.set(key, config[key]);
    });
  }
}
