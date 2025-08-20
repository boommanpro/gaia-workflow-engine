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

  it('deleteNode', () => {
    const id = 'dynamicSplit_0';
    flowOperationService.deleteNode(id);
    const node = flowDocument.getNode(id);
    expect(node).toBeUndefined();

    historyService.undo();
    const node1 = flowDocument.getNode(id);
    expect(node1?.id).toEqual(id);
  });

  it('delete first block by deleteNode', () => {
    const id = 'block_0';
    flowOperationService.deleteNode(id);
    const node = flowDocument.getNode(id);
    expect(node).toBeUndefined();

    historyService.undo();
    const node1 = flowDocument.getNode(id) as FlowNodeEntity;
    expect(node1.id).toEqual(id);
    const pre = node1.pre;
    expect(pre).toBeUndefined();
    expect(node1.next?.id).toEqual('block_1');
    expect(node1.parent?.id).toEqual('$inlineBlocks$dynamicSplit_0');
    expect(node1.originParent?.id).toEqual('dynamicSplit_0');
  });

  it('delete intermediate block by deleteNode', () => {
    const id = 'block_1';
    flowOperationService.deleteNode(id);
    const node = flowDocument.getNode(id);
    expect(node).toBeUndefined();

    historyService.undo();
    const node1 = flowDocument.getNode(id) as FlowNodeEntity;
    expect(node1.id).toEqual(id);
    expect(node1.pre?.id).toEqual('block_0');
    expect(node1.next?.id).toEqual('block_2');
    expect(node1.parent?.id).toEqual('$inlineBlocks$dynamicSplit_0');
    expect(node1.originParent?.id).toEqual('dynamicSplit_0');
  });

  it('delete last block by deleteNode', () => {
    const id = 'block_2';
    flowOperationService.deleteNode(id);
    const node = flowDocument.getNode(id);
    expect(node).toBeUndefined();

    historyService.undo();
    const node1 = flowDocument.getNode(id) as FlowNodeEntity;
    expect(node1.id).toEqual(id);
    expect(node1.pre?.id).toEqual('block_1');
    expect(node1.next).toBeUndefined();
    expect(node1.parent?.id).toEqual('$inlineBlocks$dynamicSplit_0');
    expect(node1.originParent?.id).toEqual('dynamicSplit_0');
  });

  it('delete empty group by deleteNode', async () => {
    const node = flowDocument.getNode('dynamicSplit_0') as FlowNodeEntity;
    const group = flowOperationService.createGroup([node]) as FlowNodeEntity;
    const renderStruct = flowDocument.toString();

    historyService.transact(() => {
      flowOperationService.deleteNode(node);
      flowOperationService.deleteNode(group);
    });
    await historyService.undo();
    expect(flowDocument.toString()).toEqual(renderStruct);
  });

  it('redo test delete block by deleteNode', async () => {
    flowOperationService.deleteNode('block_1');
    const str = flowDocument.toString();
    await historyService.undo();
    await historyService.redo();
    expect(flowDocument.toString()).toEqual(str);
  });
});
