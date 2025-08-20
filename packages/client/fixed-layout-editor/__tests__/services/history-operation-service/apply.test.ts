/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { FlowNodeEntity, OperationType } from '@flowgram.ai/editor';

import { createHistoryContainer } from '../../create-container';
import { baseMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service apply', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();

  it('apply deleteNodes', async () => {
    flowDocument.fromJSON(baseMock);
    const id = 'dynamicSplit_0';
    const node = flowDocument.getNode(id) as FlowNodeEntity;
    flowOperationService.apply({
      type: OperationType.deleteNodes,
      value: {
        fromId: 'start_0',
        nodes: [node.toJSON()],
      },
    });
    expect(flowDocument.getNode(id)).toBeUndefined();

    historyService.undo();
    expect(flowDocument.toJSON()).toEqual(baseMock);
  });
});
