/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, it, expect } from 'vitest';

import { createHistoryContainer } from '../../create-container';
import { baseMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service transact', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();

  beforeEach(() => {
    flowDocument.fromJSON(baseMock);
  });

  it('startTransaction endTransaction', async () => {
    flowOperationService.startTransaction();
    ['block_0', 'block_1'].forEach(id => {
      flowOperationService.deleteNode(id);
    });

    flowOperationService.addBlock('dynamicSplit_0', {
      id: 'test-block1',
    });
    flowOperationService.addBlock('dynamicSplit_0', {
      id: 'test-block2',
    });
    flowOperationService.endTransaction();

    await historyService.undo();
    expect(historyService.undoRedoService.canUndo()).toEqual(false);
    expect(flowDocument.toJSON()).toEqual(baseMock);
  });
});
