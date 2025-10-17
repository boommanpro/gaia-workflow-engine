/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { pick } from 'lodash-es';
import { injectable, inject, postConstruct } from 'inversify';
import { DisposableCollection, Emitter } from '@flowgram.ai/utils';

import { OperationService } from '../operation/operation-service';
import { OperationMeta, OperationRegistry, PushOperationOptions } from '../operation';
import { Operation } from '../operation';
import { HistoryContext } from '../history-context';
import { HistoryConfig } from '../history-config';
import { UndoRedoService } from './undo-redo-service';
import {
  HistoryMergeEvent,
  HistoryMergeEventType,
  HistoryRecord,
  IHistoryService,
  IUndoRedoElement,
} from './types';
import { StackOperation } from './stack-operation';
import { HistoryManager } from './history-manager';

@injectable()
export class HistoryService implements IHistoryService {
  @inject(UndoRedoService)
  readonly undoRedoService: UndoRedoService;

  @inject(OperationRegistry)
  readonly operationRegistry: OperationRegistry;

  @inject(OperationService)
  readonly operationService: OperationService;

  @inject(HistoryContext)
  readonly context: HistoryContext;

  @inject(HistoryConfig)
  readonly config: HistoryConfig;

  @inject(HistoryManager)
  historyManager: HistoryManager;

  private _toDispose = new DisposableCollection();

  private _transacting: boolean = false;

  private _transactOperation: StackOperation | null = null;

  private _locked: boolean = false;

  private _willDisposeEmitter = new Emitter<HistoryService>();

  private _mergeEmitter = new Emitter<HistoryMergeEvent>();

  onWillDispose = this._willDisposeEmitter.event;

  onMerge = this._mergeEmitter.event;

  get onApply() {
    return this.operationService.onApply;
  }

  @postConstruct()
  init() {
    this._toDispose.push(this._willDisposeEmitter);
    this._toDispose.push(this._mergeEmitter);
  }

  start() {
    this._locked = false;
  }

  stop() {
    this._locked = true;
  }

  limit(num: number) {
    this.undoRedoService.setLimit(num);
  }

  startTransaction() {
    if (this._transacting) {
      return;
    }

    this._transacting = true;
    const stackOperation = new StackOperation(this.operationService, []);
    this._transactOperation = stackOperation;
  }

  endTransaction() {
    const stackOperation = this._transactOperation;
    if (!stackOperation) {
      return;
    }
    if (stackOperation.getOperations().length !== 0) {
      this._pushStackOperation(stackOperation);
    }

    this._transactOperation = null;
    this._transacting = false;
  }

  transact(transaction: () => void) {
    if (this._transacting) {
      return;
    }
    this.startTransaction();
    transaction();
    this.endTransaction();
  }

  pushOperation(operation: Operation, options?: PushOperationOptions): any {
    if (!this._canPush()) {
      return;
    }

    const prev = this._transactOperation || this.undoRedoService.getLastElement();
    const operationMeta = this.operationRegistry.getOperationMeta(operation.type) as OperationMeta;

    if (!operationMeta) {
      throw new Error(`Operation meta ${operation.type} has not registered.`);
    }

    if (operationMeta.shouldSave && !operationMeta.shouldSave(operation)) {
      return operationMeta.apply(operation, this.context.source);
    }

    const res = this.operationService.applyOperation(operation, { noApply: options?.noApply });

    if (operationMeta.getURI && !operation.uri) {
      operation.uri = operationMeta.getURI(operation, this.context.source);
    }

    const shouldMerge = this._shouldMerge(operation, prev, operationMeta);

    if (shouldMerge) {
      if (typeof shouldMerge === 'object') {
        const operation = prev.getLastOperation();
        operation.value = shouldMerge.value;
        this._mergeEmitter.fire({
          type: HistoryMergeEventType.UPDATE,
          value: {
            element: prev,
            operation: operation,
            value: shouldMerge.value,
          },
        });
      } else {
        const op = prev.pushOperation(operation);
        this._mergeEmitter.fire({
          type: HistoryMergeEventType.ADD,
          value: {
            element: prev,
            operation: op,
          },
        });
      }
    } else {
      const stackOperation = new StackOperation(this.operationService, [operation]);
      this._pushStackOperation(stackOperation);
    }

    return res;
  }

  getHistoryOperations(): Operation<unknown>[] {
    return this.historyManager.historyStack.items
      .reverse()
      .map((item) =>
        item.operations.map((o) => ({
          ...pick(o, ['type', 'value']),
          label: o.label || o.type,
        }))
      )
      .flat();
  }

  async undo(): Promise<void> {
    await this.undoRedoService.undo();
  }

  async redo(): Promise<void> {
    await this.undoRedoService.redo();
  }

  canUndo(): boolean {
    return this.undoRedoService.canUndo();
  }

  canRedo(): boolean {
    return this.undoRedoService.canRedo();
  }

  getSnapshot(): unknown {
    return this.config.getSnapshot();
  }

  getRecords(): Promise<HistoryRecord[]> {
    throw new Error('Method not implemented.');
  }

  restore(historyRecord: HistoryRecord): Promise<void> {
    throw new Error('Method not implemented.');
  }

  clear() {
    this.undoRedoService.clear();
  }

  dispose(): void {
    this._willDisposeEmitter.fire(this);
    this._toDispose.dispose();
  }

  private _canPush() {
    if (this._locked) {
      return false;
    }
    return this.undoRedoService.canPush();
  }

  private _pushStackOperation(stackOperation: StackOperation) {
    this.undoRedoService.pushElement(stackOperation);
    this.undoRedoService.clearRedoStack();
  }

  private _shouldMerge(operation: Operation, prev: IUndoRedoElement, operationMeta: OperationMeta) {
    if (!prev) {
      return false;
    }

    if (this._transacting) {
      return true;
    }
    return (
      operationMeta.shouldMerge &&
      operationMeta.shouldMerge(operation, prev.getLastOperation(), prev as StackOperation)
    );
  }
}
