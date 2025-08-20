/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, multiInject, optional, postConstruct } from 'inversify';
import { Disposable, DisposableCollection } from '@flowgram.ai/utils';

import { OperationMeta } from './types';
import { OperationContribution } from './operation-contribution';

@injectable()
export class OperationRegistry {
  private readonly _operationMetas: Map<string, OperationMeta> = new Map();

  @multiInject(OperationContribution)
  @optional()
  protected readonly contributions: OperationContribution[] = [];

  @postConstruct()
  protected init() {
    for (const contrib of this.contributions) {
      contrib.registerOperationMeta?.(this);
    }
  }

  /**
   * 注册操作的元数据
   * @param operationMeta 操作的元数据
   * @returns 销毁函数
   */
  registerOperationMeta(operationMeta: OperationMeta): Disposable {
    if (this._operationMetas.has(operationMeta.type)) {
      console.warn(`A operation meta ${operationMeta.type} is already registered.`);
      return Disposable.NULL;
    }
    const toDispose = new DisposableCollection(this._doRegisterOperationMetaMeta(operationMeta));
    return toDispose;
  }

  /**
   * 获取操作的元数据
   * @param type 操作类型
   * @returns 操作的元数据
   */
  getOperationMeta(type: string): OperationMeta | undefined {
    return this._operationMetas.get(type);
  }

  private _doRegisterOperationMetaMeta(operationMeta: OperationMeta): Disposable {
    this._operationMetas.set(operationMeta.type, operationMeta);
    return {
      dispose: () => {
        this._operationMetas.delete(operationMeta.type);
      },
    };
  }
}
