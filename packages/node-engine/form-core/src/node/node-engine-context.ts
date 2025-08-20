/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';

export interface INodeEngineContext {
  readonly: boolean;
}

/**
 * NodeEngineContext 在 Node Engine 中为全局单例, 它的作用是让Node之间共享数据。
 * context 分为内置context(如 readonly) 和 自定义context(业务可以按需注入)
 */
@injectable()
export class NodeEngineContext {
  static DEFAULT_READONLY = false;

  static DEFAULT_JSON = { readonly: NodeEngineContext.DEFAULT_READONLY };

  readonly onChangeEmitter = new Emitter<NodeEngineContext>();

  readonly onChange = this.onChangeEmitter.event;

  private _readonly: boolean = NodeEngineContext.DEFAULT_READONLY;

  private _json: INodeEngineContext = NodeEngineContext.DEFAULT_JSON;

  get json(): INodeEngineContext {
    return this._json;
  }

  get readonly(): boolean {
    return this._readonly;
  }

  set readonly(value: boolean) {
    this._readonly = value;
    this.fireChange();
  }

  private fireChange(): void {
    this.updateJSON();
    this.onChangeEmitter.fire(this);
  }

  private updateJSON(): void {
    this._json = {
      readonly: this._readonly,
    };
  }
}
