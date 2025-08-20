/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/editor';

import { createHistoryContainer } from '../../create-container';
import { baseMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();
  beforeEach(() => {
    flowDocument.fromJSON(baseMock);
  });

  it('addFromNode', () => {
    const id = 'test-id';
    const type = 'test';
    const nodeJSON = {
      id,
      type,
    };
    const added = flowOperationService.addFromNode('start_0', nodeJSON);
    expect(added.id).toEqual(id);
    const node = flowDocument.getNode(id) as FlowNodeEntity;
    expect(node).toBe(added);

    historyService.undo();
    const node2 = flowDocument.getNode(id) as FlowNodeEntity;
    expect(node2).toBeUndefined();
  });

  it('add first node in a block by addFromNode', () => {
    const id = 'test-id';
    const blockIconId = '$blockOrderIcon$block_1';
    const added = flowOperationService.addFromNode(blockIconId, {
      id,
      type: 'test',
    });
    expect(added.id).toEqual(id);
    const node = flowDocument.getNode(id) as FlowNodeEntity;
    expect(node).toBe(added);
    expect(node.pre?.id).toEqual(blockIconId);
  });
});
