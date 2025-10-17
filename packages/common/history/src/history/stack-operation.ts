/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { cloneDeep } from 'lodash-es';
import { DisposableCollection } from '@flowgram.ai/utils';

import { OperationService } from '../operation/operation-service';
import { Operation, OperationWithId } from '../operation';
import { IUndoRedoElement, UndoRedoChangeType } from './types';

export class StackOperation implements IUndoRedoElement {
  label?: string | undefined;

  description?: string | undefined;

  private _operations: OperationWithId[];

  private _toDispose = new DisposableCollection();

  private _timestamp: number = Date.now();

  private _operationService: OperationService;

  private _id: string;

  get id() {
    return this._id;
  }

  constructor(operationService: OperationService, operations: Operation[] = []) {
    this._operationService = operationService;
    this._operations = operations.map((op) => this._operation(op));
    this._id = operationService.config.generateId();
  }

  getTimestamp(): number {
    return this._timestamp;
  }

  pushOperation(operation: Operation): OperationWithId {
    const op = this._operation(operation);
    this._operations.push(op);
    return op;
  }

  getOperations(): Operation[] {
    return this._operations;
  }

  getChangeOperations(type: UndoRedoChangeType): Operation[] {
    if (type === UndoRedoChangeType.UNDO) {
      return this._operationService.inverseOperations(this._operations);
    }
    return this._operations;
  }

  getFirstOperation(): Operation {
    return this._operations[0];
  }

  getLastOperation(): Operation<unknown> {
    return this._operations[this._operations.length - 1];
  }

  async undo(): Promise<void> {
    const inverseOps = this._operationService.inverseOperations(this._operations);

    for (const op of inverseOps) {
      await this._apply(op);
    }
  }

  async redo(): Promise<void> {
    for (const op of this._operations) {
      await this._apply(op);
    }
  }

  revert(type: UndoRedoChangeType): void | Promise<void> {
    let operations: Operation[] = this._operations;

    if (type !== UndoRedoChangeType.UNDO) {
      operations = this._operations.map((op) => this._inverse(op)).reverse();
    }

    for (const op of operations) {
      this._apply(op);
    }
  }

  private _inverse(op: Operation): Operation {
    return this._operationService.inverseOperation(op);
  }

  private async _apply(op: Operation) {
    await this._operationService.applyOperation(op);
  }

  private _operation(op: Operation) {
    return {
      ...op,
      value: cloneDeep(op.value),
      id: this._operationService.config.generateId(),
    };
  }

  dispose(): void {
    this._toDispose.dispose();
  }
}
