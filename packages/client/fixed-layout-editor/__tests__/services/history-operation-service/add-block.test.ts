/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/editor';

import { createHistoryContainer } from '../../create-container';
import { baseMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service addNode', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();

  beforeEach(() => {
    flowDocument.fromJSON(baseMock);
  });

  it('addBlock', async () => {
    const block0 = flowDocument.getNode('block_0') as FlowNodeEntity;
    const block1 = flowDocument.getNode('block_1') as FlowNodeEntity;
    const block2 = flowDocument.getNode('block_2') as FlowNodeEntity;

    const target = flowDocument.getNode('dynamicSplit_0') as FlowNodeEntity;

    // 测试添加分支
    const added = flowOperationService.addBlock(target, {
      id: 'test-block',
      type: 'test-block',
    });
    const entity = flowDocument.getNode(added.id);
    const children = target.collapsedChildren[1].children;

    expect(entity).toBe(added);
    expect(entity?.parent?.id).toEqual('$inlineBlocks$dynamicSplit_0');
    expect(entity?.originParent).toBe(target);
    expect(children).toEqual([block0, block1, block2, added]);

    // 测试添加分支，index为0
    const added0 = flowOperationService.addBlock(
      target,
      {
        id: 'test-block0',
        type: 'test-block0',
      },
      {
        index: 0,
      },
    );

    expect(children).toEqual([added0, block0, block1, block2, added]);

    // 测试undo
    await historyService.undo();
    expect(children).toEqual([block0, block1, block2, added]);
    await historyService.undo();
    expect(children).toEqual([block0, block1, block2]);
  });
});
