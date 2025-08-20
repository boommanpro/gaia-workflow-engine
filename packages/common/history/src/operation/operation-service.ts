/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject, postConstruct } from 'inversify';
import { DisposableCollection, Emitter } from '@flowgram.ai/utils';

import { HistoryContext } from '../history-context';
import { HistoryConfig } from '../history-config';
import { Operation } from './types';
import { OperationRegistry } from './operation-registry';

@injectable()
export class OperationService {
  @inject(OperationRegistry)
  readonly operationRegistry: OperationRegistry;

  @inject(HistoryContext)
  readonly context: HistoryContext;

  @inject(HistoryConfig)
  config: HistoryConfig;

  readonly applyEmitter = new Emitter<Operation>();

  readonly onApply = this.applyEmitter.event;

  private _toDispose = new DisposableCollection();

  @postConstruct()
  init() {
    this._toDispose.push(this.applyEmitter);
  }

  /**
   * 执行操作
   * @param op
   * @returns
   */
  applyOperation(op: Operation, options?: { noApply?: boolean }): any {
    const meta = this.operationRegistry.getOperationMeta(op.type);

    if (!meta) {
      throw new Error(`Operation meta ${op.type} has not registered.`);
    }

    let res;
    if (!options?.noApply) {
      res = meta.apply(op, this.context.source);
    }

    this.applyEmitter.fire(op);

    return res;
  }

  /**
   * 根据操作类型获取操作的label
   * @param operation 操作
   * @returns
   */
  getOperationLabel(operation: Operation): string | undefined {
    const operationMeta = this.operationRegistry.getOperationMeta(operation.type);

    if (operationMeta && operationMeta.getLabel) {
      return operationMeta.getLabel(operation, this.context.source);
    }
  }

  /**
   * 根据操作类型获取操作的description
   * @param operation 操作
   * @returns
   */
  getOperationDescription(operation: Operation): string | undefined {
    const operationMeta = this.operationRegistry.getOperationMeta(operation.type);

    if (operationMeta && operationMeta.getDescription) {
      return operationMeta.getDescription(operation, this.context.source);
    }
  }

  /**
   * 操作取反
   * @param operations
   * @returns
   */
  inverseOperations(operations: Operation[]) {
    return operations.map(op => this.inverseOperation(op)).reverse();
  }

  inverseOperation(op: Operation): Operation {
    const meta = this.operationRegistry.getOperationMeta(op.type);

    if (!meta) {
      throw new Error(`Operation meta ${op.type} has not registered.`);
    }
    return meta.inverse(op);
  }

  dispose() {
    this._toDispose.dispose();
  }
}
