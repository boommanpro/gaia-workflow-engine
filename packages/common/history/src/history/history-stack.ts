/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { cloneDeep } from 'lodash-es';
import { injectable, inject } from 'inversify';
import { DisposableCollection, Emitter } from '@flowgram.ai/utils';

import { HistoryOperation, Operation, OperationWithId } from '../operation';
import { HistoryConfig } from '../history-config';
import {
  type HistoryItem,
  HistoryStackChangeType,
  type HistoryStackItem,
  HistoryStackChangeEvent,
  UndoRedoChangeType,
} from './types';
import { type HistoryService } from './history-service';

/**
 * 历史栈，聚合所有历史操作
 */
@injectable()
export class HistoryStack {
  @inject(HistoryConfig)
  historyConfig: HistoryConfig;

  private _items: HistoryItem[] = [];

  readonly onChangeEmitter = new Emitter<HistoryStackChangeEvent>();

  readonly onChange = this.onChangeEmitter.event;

  private _toDispose: DisposableCollection = new DisposableCollection();

  limit = 100;

  constructor() {
    this._toDispose.push(this.onChangeEmitter);
  }

  get items(): HistoryItem[] {
    return this._items;
  }

  add(service: HistoryService, item: HistoryStackItem) {
    const historyItem = this._getHistoryItem(service, item);
    this._items.unshift(historyItem);
    if (this._items.length > this.limit) {
      this._items.pop();
    }
    this.onChangeEmitter.fire({
      type: HistoryStackChangeType.ADD,
      value: historyItem,
      service,
    });
    return historyItem;
  }

  findById(id: string): HistoryItem | undefined {
    return this._items.find((item) => item.id === id);
  }

  changeByIndex(index: number, service: HistoryService, item: HistoryStackItem) {
    const historyItem = this._getHistoryItem(service, item);
    this._items[index] = historyItem;
    this.onChangeEmitter.fire({
      type: HistoryStackChangeType.UPDATE,
      value: historyItem,
      service,
    });
  }

  addOperation(service: HistoryService, id: string, op: OperationWithId) {
    const historyItem = this._items.find((item) => item.id === id);
    if (!historyItem) {
      console.warn('no history item found');
      return;
    }

    const newOperatopn = this._getHistoryOperation(service, op);
    historyItem.operations.push(newOperatopn);

    this.onChangeEmitter.fire({
      type: HistoryStackChangeType.ADD_OPERATION,
      value: {
        historyItem,
        operation: newOperatopn,
      },
      service,
    });
  }

  updateOperation(service: HistoryService, id: string, op: OperationWithId) {
    const historyItem = this._items.find((item) => item.id === id);
    if (!historyItem) {
      console.warn('no history item found');
      return;
    }
    const index = historyItem.operations.findIndex((op) => op.id === op.id);
    if (index < 0) {
      console.warn('no operation found');
      return;
    }
    const newOperatopn = this._getHistoryOperation(service, op);
    historyItem.operations.splice(index, 1, newOperatopn);
    this.onChangeEmitter.fire({
      type: HistoryStackChangeType.UPDATE_OPERATION,
      value: {
        historyItem,
        operation: newOperatopn,
      },
      service,
    });
  }

  clear() {
    this._items = [];
  }

  dispose() {
    this._items = [];
    this._toDispose.dispose();
  }

  private _getHistoryItem(service: HistoryService, item: HistoryStackItem): HistoryItem {
    return {
      ...item,
      uri: service.context.uri,
      time: HistoryStack.dateFormat(item.timestamp),
      operations: item.operations.map((op) =>
        this._getHistoryOperation(service, op, item.type !== UndoRedoChangeType.PUSH)
      ),
    };
  }

  private _getHistoryOperation(
    service: HistoryService,
    op: Operation,
    generateId: boolean = false
  ): HistoryOperation {
    let id;
    if (generateId) {
      id = this.historyConfig.generateId();
    } else {
      const oldId = (op as OperationWithId).id;
      if (!oldId) {
        throw new Error('no operation id found');
      }
      id = oldId;
    }

    return {
      ...cloneDeep(op),
      id,
      label: service.operationService.getOperationLabel(op),
      description: service.operationService.getOperationDescription(op),
      timestamp: Date.now(),
    };
  }

  static dateFormat(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }
}
