/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { type Disposable, DisposableCollection } from '@flowgram.ai/utils';

import { OperationWithId } from '../operation';
import { HistoryConfig } from '../history-config';
import { type UndoRedoChangeEvent } from './types';
import {
  type IHistoryManager,
  type HistoryStackItem,
  UndoRedoChangeType,
  HistoryMergeEventType,
  HistoryMergeEvent,
} from './types';
import { StackOperation } from './stack-operation';
import { HistoryStack } from './history-stack';
import { type HistoryService } from './history-service';

@injectable()
export class HistoryManager implements IHistoryManager {
  @inject(HistoryStack) readonly historyStack: HistoryStack;

  @inject(HistoryConfig) readonly historyConfig: HistoryConfig;

  private _historyServices = new Map<HistoryService, Disposable>();

  private _toDispose = new DisposableCollection();

  registerHistoryService(service: HistoryService): void {
    const toDispose = new DisposableCollection();
    toDispose.pushAll([
      service.undoRedoService.onChange((event: UndoRedoChangeEvent) => {
        if (event.type === UndoRedoChangeType.CLEAR) {
          return;
        }

        const { type, element } = event;
        const operations = element.getChangeOperations(type);
        const historyStackItem: HistoryStackItem = {
          id:
            type === UndoRedoChangeType.PUSH
              ? (element as StackOperation).id
              : this.historyConfig.generateId(),
          type,
          uri: service.context.uri,
          operations,
          timestamp: Date.now(),
        };
        this.historyStack.add(service, historyStackItem);
      }),
      service.onMerge((event) => {
        this._handleMerge(service, event);
      }),
    ]);
    this._historyServices.set(service, toDispose);

    this._toDispose.push(
      service.onWillDispose(() => {
        this.unregisterHistoryService(service);
      })
    );
  }

  unregisterHistoryService(service: HistoryService): void {
    const disposable = this._historyServices.get(service);
    if (!disposable) {
      return;
    }
    disposable.dispose();
    this._historyServices.delete(service);
  }

  getHistoryServiceByURI(uri: string) {
    for (const service of this._historyServices.keys()) {
      if (service.context.uri === uri) {
        return service;
      }
    }
  }

  getFirstHistoryService() {
    for (const service of this._historyServices.keys()) {
      return service;
    }
  }

  dispose(): void {
    this._toDispose.dispose();
    this.historyStack.dispose();

    this._historyServices.forEach((service) => service.dispose());
    this._historyServices.clear();
  }

  _handleMerge(service: HistoryService, event: HistoryMergeEvent) {
    const { element, operation } = event.value;

    const find = this.historyStack.findById((element as StackOperation).id);

    if (!find) {
      return;
    }

    if (!(operation as OperationWithId).id) {
      console.warn('no operation id found');
      return;
    }

    if (event.type === HistoryMergeEventType.UPDATE) {
      this.historyStack.updateOperation(
        service,
        (element as StackOperation).id,
        operation as OperationWithId
      );
    }

    if (event.type === HistoryMergeEventType.ADD) {
      this.historyStack.addOperation(
        service,
        (element as StackOperation).id,
        operation as OperationWithId
      );
    }
  }
}
