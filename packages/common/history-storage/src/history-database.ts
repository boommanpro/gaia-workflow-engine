/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import Dexie, { type Table } from 'dexie';

import { HistoryOperationRecord, HistoryRecord } from './types';

/**
 * 历史数据库
 */
export class HistoryDatabase extends Dexie {
  readonly history: Table<HistoryRecord>;

  readonly operation: Table<HistoryOperationRecord>;

  resourceStorageLimit: number = 100;

  constructor(databaseName: string = 'ide-history-storage') {
    super(databaseName);
    this.version(1).stores({
      history: '++id, &uuid, resourceURI',
      operation: '++id, &uuid, historyId, uri, resourceURI',
    });
  }

  /**
   * 某个uri下所有的history记录
   * @param resourceURI 资源uri
   * @returns
   */
  allHistoryByResourceURI(resourceURI: string) {
    return this.history.where({ resourceURI }).toArray();
  }

  /**
   * 根据uuid获取历史
   * @param uuid
   * @returns
   */
  getHistoryByUUID(uuid: string) {
    return this.history.get({ uuid });
  }

  /**
   * 某个uri下所有的operation记录
   * @param resourceURI 资源uri
   * @returns
   */
  allOperationByResourceURI(resourceURI: string) {
    return this.operation.where({ resourceURI }).toArray();
  }

  /**
   * 添加历史记录
   * @param history 历史记录
   * @param operations 操作记录
   * @returns
   */
  addHistoryRecord(history: HistoryRecord, operations: HistoryOperationRecord[]) {
    return this.transaction('rw', this.history, this.operation, async () => {
      const count = await this.history.where({ resourceURI: history.resourceURI }).count();
      if (count >= this.resourceStorageLimit) {
        const limit = count - this.resourceStorageLimit;
        const items = await this.history
          .where({ resourceURI: history.resourceURI })
          .limit(limit)
          .toArray();
        const ids = items.map(i => i.id);
        const uuid = items.map(i => i.uuid);
        await Promise.all([
          this.history.bulkDelete(ids),
          ...uuid.map(async uuid => {
            await this.operation.where({ historyId: uuid }).delete();
          }),
        ]);
      }

      return Promise.all([this.history.add(history), this.operation.bulkAdd(operations)]);
    });
  }

  /**
   * 更新历史记录
   * @param historyRecord
   * @returns
   */
  async updateHistoryByUUID(uuid: string, historyRecord: Partial<HistoryRecord>) {
    const history = await this.getHistoryByUUID(uuid);
    if (!history) {
      console.warn('no history record found');
      return;
    }
    return this.history.update(history.id, historyRecord);
  }

  /**
   * 添加操作记录
   * @param record 操作记录
   * @returns
   */
  addOperationRecord(record: HistoryOperationRecord) {
    return this.operation.add(record);
  }

  /**
   * 更新操作记录
   * @param record 操作记录
   * @returns
   */
  async updateOperationRecord(record: HistoryOperationRecord) {
    const op = await this.operation.where({ uuid: record.uuid }).first();
    if (!op) {
      console.warn('no operation record found');
      return;
    }
    return this.operation.put({
      id: op.id,
      ...record,
    });
  }

  /**
   * 重置数据库
   * @returns
   */
  reset() {
    return this.transaction('rw', this.history, this.operation, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });
  }

  /**
   * 清空某个资源下所有的数据
   * @param resourceURI
   * @returns
   */
  resetByResourceURI(resourceURI: string) {
    return this.transaction('rw', this.history, this.operation, async () => {
      await Promise.all(this.tables.map(table => table.where({ resourceURI }).delete()));
    });
  }
}
