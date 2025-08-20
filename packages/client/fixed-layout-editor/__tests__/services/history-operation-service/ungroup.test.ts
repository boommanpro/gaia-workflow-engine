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

  it('ungroup', async () => {
    const node1 = flowOperationService.addFromNode('start_0', {
      id: 'add',
      type: 'add',
    });
    const node2 = flowDocument.getNode('dynamicSplit_0') as FlowNodeEntity;
    flowDocument.transformer.refresh();
    const group = flowOperationService.createGroup([node1, node2]) as FlowNodeEntity;
    const root = flowDocument.getNode('root');

    flowOperationService.ungroup(group);
    expect(root?.collapsedChildren.map(c => c.id)).toEqual([
      'start_0',
      'add',
      'dynamicSplit_0',
      'end_0',
    ]);

    await historyService.undo();
    expect(root?.collapsedChildren.map(c => c.id)).toEqual(['start_0', group.id, 'end_0']);
  });
});
