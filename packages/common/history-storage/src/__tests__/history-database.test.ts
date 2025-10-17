/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeEach } from 'vitest';
import { cloneDeep, omit } from 'lodash-es';

import { HistoryOperationRecord, HistoryRecord } from '../types';
import { HistoryDatabase } from '../history-database';
import {
  MOCK_HISTORY1,
  MOCK_HISTORY2,
  MOCK_OPERATION1,
  MOCK_OPERATION2,
  MOCK_OPERATION3,
  MOCK_RESOURCE_URI1,
} from '../__mocks__';

describe('history-database', () => {
  let db: HistoryDatabase;
  let history1: HistoryRecord;
  let history2: HistoryRecord;
  let operation1: HistoryOperationRecord;
  let operation2: HistoryOperationRecord;

  beforeEach(async () => {
    db = new HistoryDatabase();
    await db.reset();
    history1 = cloneDeep(MOCK_HISTORY1);
    history2 = cloneDeep(MOCK_HISTORY2);
    operation1 = cloneDeep(MOCK_OPERATION1);
    operation2 = cloneDeep(MOCK_OPERATION2);
  });

  it('addHistoryRecord allHistoryByResourceURI allOperationByResourceURI', async () => {
    const operations = [operation1, operation2];
    const res = await db.addHistoryRecord(history1, operations);
    await db.addHistoryRecord(history2, []);
    expect(res.length).toEqual(2);
    const [dbHistory] = await db.allHistoryByResourceURI(MOCK_RESOURCE_URI1);
    expect(MOCK_HISTORY1).toEqual(omit(dbHistory, ['id']));
    const dbOperations = await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);
    expect(operations).toEqual(dbOperations.map((o) => omit(o, ['id'])));

    const operation3 = cloneDeep(MOCK_OPERATION3);

    await db.addOperationRecord(operation3);

    const dbOperations3 = await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);
    expect([MOCK_OPERATION1, MOCK_OPERATION2, MOCK_OPERATION3]).toEqual(
      dbOperations3.map((o) => omit(o, ['id']))
    );
  });

  it('getHistoryByUUID', async () => {
    await db.addHistoryRecord(history1, []);
    const res = await db.getHistoryByUUID(history1.uuid);
    expect(omit(res, ['id'])).toEqual(MOCK_HISTORY1);
  });

  it('updateHistoryByUUID', async () => {
    await db.addHistoryRecord(history1, []);
    const dbHistory = await db.getHistoryByUUID(history1.uuid);
    if (!dbHistory) {
      throw new Error('no dbHistory');
    }
    const resourceJSON = 'newResourceJSON';
    await db.updateHistoryByUUID(dbHistory.uuid, {
      resourceJSON,
    });
    const [dbHistory1] = await db.allHistoryByResourceURI(MOCK_RESOURCE_URI1);
    expect(dbHistory1.resourceJSON).toEqual(resourceJSON);
  });

  it('addOperationRecord', async () => {
    await db.addOperationRecord(operation1);
    await db.addOperationRecord(operation2);
    const dbOperations = await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);
    expect([MOCK_OPERATION1, MOCK_OPERATION2]).toEqual(dbOperations.map((o) => omit(o, ['id'])));
  });

  it('updateOperationRecord', async () => {
    await db.addOperationRecord(operation1);
    await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);

    await db.updateOperationRecord({ ...MOCK_OPERATION2, uuid: MOCK_OPERATION1.uuid });

    const [dbUpdatedOperation1] = await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);
    expect(omit(MOCK_OPERATION2, ['uuid'])).toEqual(omit(dbUpdatedOperation1, ['id', 'uuid']));
  });

  it('reset', async () => {
    await db.addHistoryRecord(history1, [operation1, operation2]);
    await db.reset();
    const dbOperation = await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);
    const dbHistory = await db.allHistoryByResourceURI(MOCK_RESOURCE_URI1);
    expect(dbOperation.length).toEqual(0);
    expect(dbHistory.length).toEqual(0);
  });

  it('resetByResourceURI', async () => {
    await db.addHistoryRecord(history1, [operation1, operation2]);
    await db.resetByResourceURI(MOCK_RESOURCE_URI1);
    const dbOperation = await db.allOperationByResourceURI(MOCK_RESOURCE_URI1);
    const dbHistory = await db.allHistoryByResourceURI(MOCK_RESOURCE_URI1);
    expect(dbOperation.length).toEqual(0);
    expect(dbHistory.length).toEqual(0);
  });

  it('resourceStorageLimit', async () => {
    db.resourceStorageLimit = 1;
    await db.addHistoryRecord(history1, []);
    await db.addHistoryRecord(history2, []);
    const res = await db.allHistoryByResourceURI(MOCK_RESOURCE_URI1);
    expect(res.length).toEqual(1);
  });
});
