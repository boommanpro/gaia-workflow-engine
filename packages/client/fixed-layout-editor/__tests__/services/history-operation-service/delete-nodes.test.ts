/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { getNodeChildrenIds } from '../../utils';
import { createHistoryContainer } from '../../create-container';
import { emptyMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service deleteNodes', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();

  let toDelete1, toDelete2, toDelete3;

  function getRootChildrenIds() {
    return getNodeChildrenIds(flowDocument.getNode('root'));
  }

  beforeEach(() => {
    flowDocument.fromJSON(emptyMock);
    // start_0 -> to-delete1 -> to-delete2 -> to-delete3 -> end_0
    toDelete3 = flowOperationService.addFromNode('start_0', {
      id: 'to-delete3',
      type: 'test',
    });

    toDelete2 = flowOperationService.addFromNode('start_0', {
      id: 'to-delete2',
      type: 'test',
    });

    toDelete1 = flowOperationService.addFromNode('start_0', {
      id: 'to-delete1',
      type: 'test',
    });
  });

  it('delete order nodes', async () => {
    const toDelete1JSON = toDelete1.toJSON();
    const toDelete2JSON = toDelete2.toJSON();

    flowOperationService.deleteNodes(['to-delete1', toDelete2]);
    expect(flowDocument.getNode('to-delete1')).toBeUndefined();
    expect(flowDocument.getNode('to-delete2')).toBeUndefined();

    expect(getRootChildrenIds()).toEqual(['start_0', 'to-delete3', 'end_0']);

    await historyService.undo();
    expect(flowDocument.getNode('to-delete1')?.toJSON()).toEqual(toDelete1JSON);
    expect(flowDocument.getNode('to-delete2')?.toJSON()).toEqual(toDelete2JSON);

    expect(getRootChildrenIds()).toEqual([
      'start_0',
      'to-delete1',
      'to-delete2',
      'to-delete3',
      'end_0',
    ]);
  });

  it('delete reverse nodes', async () => {
    const toDelete1JSON = toDelete1.toJSON();
    const toDelete2JSON = toDelete2.toJSON();

    flowOperationService.deleteNodes([toDelete2, 'to-delete1']);
    expect(flowDocument.getNode('to-delete1')).toBeUndefined();
    expect(flowDocument.getNode('to-delete2')).toBeUndefined();

    expect(getRootChildrenIds()).toEqual(['start_0', 'to-delete3', 'end_0']);

    await historyService.undo();
    expect(flowDocument.getNode('to-delete1')?.toJSON()).toEqual(toDelete1JSON);
    expect(flowDocument.getNode('to-delete2')?.toJSON()).toEqual(toDelete2JSON);

    expect(getRootChildrenIds()).toEqual([
      'start_0',
      'to-delete1',
      'to-delete2',
      'to-delete3',
      'end_0',
    ]);
  });

  it('delete random nodes', async () => {
    const toDelete1JSON = toDelete1.toJSON();
    const toDelete3JSON = toDelete3.toJSON();

    flowOperationService.deleteNodes([toDelete3, 'to-delete1']);
    expect(flowDocument.getNode('to-delete1')).toBeUndefined();
    expect(flowDocument.getNode('to-delete3')).toBeUndefined();

    expect(getRootChildrenIds()).toEqual(['start_0', 'to-delete2', 'end_0']);

    await historyService.undo();
    expect(flowDocument.getNode('to-delete1')?.toJSON()).toEqual(toDelete1JSON);
    expect(flowDocument.getNode('to-delete3')?.toJSON()).toEqual(toDelete3JSON);

    expect(getRootChildrenIds()).toEqual([
      'start_0',
      'to-delete1',
      'to-delete2',
      'to-delete3',
      'end_0',
    ]);
  });
});
