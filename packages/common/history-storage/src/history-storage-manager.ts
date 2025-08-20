/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { DisposableCollection } from '@flowgram.ai/utils';
import {
  HistoryItem,
  HistoryManager,
  HistoryOperation,
  HistoryStackChangeType,
  HistoryService,
  HistoryStackAddOperationEvent,
  HistoryStackUpdateOperationEvent,
} from '@flowgram.ai/history';
import { PluginContext } from '@flowgram.ai/core';

import { HistoryOperationRecord, HistoryRecord, HistoryStoragePluginOptions } from './types';
import { HistoryDatabase } from './history-database';

/**
 * 历史存储管理
 */
@injectable()
export class HistoryStorageManager {
  private _toDispose = new DisposableCollection();

  db: HistoryDatabase;

  @inject(HistoryManager)
  protected historyManager: HistoryManager;

  /**
   * 初始化
   * @param ctx
   */
  onInit(_ctx: PluginContext, opts: HistoryStoragePluginOptions) {
    this.db = new HistoryDatabase(opts?.databaseName);

    if (opts?.resourceStorageLimit) {
      this.db.resourceStorageLimit = opts.resourceStorageLimit;
    }

    this._toDispose.push(
      this.historyManager.historyStack.onChange(event => {
        if (event.type === HistoryStackChangeType.ADD) {
          const [history, operations] = this.historyItemToRecord(event.service, event.value);
          this.db.addHistoryRecord(history, operations).catch(console.error);
        }

        // operation merge的时候需要更新snapshot
        if (
          [HistoryStackChangeType.ADD_OPERATION, HistoryStackChangeType.UPDATE_OPERATION].includes(
            event.type,
          )
        ) {
          const {
            service,
            value: { historyItem },
          } = event as HistoryStackAddOperationEvent | HistoryStackUpdateOperationEvent;
          // 更新快照
          this.db
            .updateHistoryByUUID(historyItem.id, {
              resourceJSON: service.getSnapshot() || '',
            })
            .catch(console.error);
        }

        if (event.type === HistoryStackChangeType.ADD_OPERATION) {
          const operationRecord: HistoryOperationRecord = this.historyOperationToRecord(
            event.value.historyItem,
            event.value.operation,
          );
          this.db.addOperationRecord(operationRecord).catch(console.error);
        }
        if (event.type === HistoryStackChangeType.UPDATE_OPERATION) {
          const operationRecord: HistoryOperationRecord = this.historyOperationToRecord(
            event.value.historyItem,
            event.value.operation,
          );
          this.db.updateOperationRecord(operationRecord).catch(console.error);
        }
      }),
    );
  }

  /**
   * 内存历史转数据表记录
   * @param historyItem
   * @returns
   */
  historyItemToRecord(
    historyService: HistoryService,
    historyItem: HistoryItem,
  ): [HistoryRecord, HistoryOperationRecord[]] {
    const operations = historyItem.operations.map(op =>
      this.historyOperationToRecord(historyItem, op),
    );

    return [
      {
        uuid: historyItem.id,
        timestamp: historyItem.timestamp,
        type: historyItem.type,
        resourceURI: historyItem.uri?.toString() || '',
        resourceJSON: historyService.getSnapshot() || '',
      },
      operations,
    ];
  }

  /**
   * 内存操作转数据表操作
   * @param historyItem
   * @param op
   * @returns
   */
  historyOperationToRecord(historyItem: HistoryItem, op: HistoryOperation): HistoryOperationRecord {
    return {
      uuid: op.id,
      type: op.type,
      timestamp: op.timestamp,
      label: op.label || '',
      uri: op?.uri?.toString() || '',
      resourceURI: historyItem.uri?.toString() || '',
      description: op.description || '',
      value: JSON.stringify(op.value),
      historyId: historyItem.id,
    };
  }

  /**
   * 销毁
   */
  dispose() {
    this._toDispose.dispose();
  }
}
