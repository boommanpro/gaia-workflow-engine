/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/editor';

import { getRootChildrenIds } from '../../utils';
import { createHistoryContainer } from '../../create-container';
import { baseMock, emptyMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service addNode', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();

  it('addNode simple', async () => {
    flowDocument.fromJSON(emptyMock);
    flowOperationService.addNode(
      {
        type: 'test',
        id: 'test',
      },
      {
        parent: flowDocument.getNode('root'),
        index: 1,
      },
    );
    expect(getRootChildrenIds(flowDocument)).toEqual(['start_0', 'test', 'end_0']);

    // 测试undo
    await historyService.undo();

    expect(getRootChildrenIds(flowDocument)).toEqual(['start_0', 'end_0']);
  });

  it('addNode composed', async () => {
    flowDocument.fromJSON(baseMock);
    const nodeJSON = {
      id: 'test-node',
      type: 'test',
    };
    const parent = flowDocument.getNode('start_0') as FlowNodeEntity;
    const added = flowOperationService.addNode(nodeJSON, {
      parent,
    });
    const entity = flowDocument.getNode(added.id);
    expect(entity).toBe(added);
    expect(entity?.parent).toBe(parent);
    expect(entity?.originParent).toBeUndefined();
    expect(parent.collapsedChildren).toEqual([added]);

    // 测试hidden
    const added1 = flowOperationService.addNode(
      {
        id: 'test-node1',
        type: 'test1',
      },
      {
        parent,
        hidden: true,
      },
    );
    const entity1 = flowDocument.getNode(added1.id) as FlowNodeEntity;
    expect(entity1).toBe(added1);
    expect(entity1.hidden).toBe(true);
    expect(parent.collapsedChildren).toEqual([added, added1]);

    // 测试index添加
    const added2 = flowOperationService.addNode(
      {
        id: 'test-node2',
        type: 'test2',
      },
      {
        parent,
        index: 1,
      },
    );
    expect(parent.collapsedChildren).toEqual([added, added2, added1]);

    // 测试undo
    await historyService.undo();
    expect(flowDocument.getNode(added2.id)).toBeUndefined();
    expect(parent.collapsedChildren).toEqual([added, added1]);

    await historyService.undo();
    expect(flowDocument.getNode(added1.id)).toBeUndefined();
    expect(parent.collapsedChildren).toEqual([added]);

    await historyService.undo();
    expect(flowDocument.getNode(added.id)).toBeUndefined();
    expect(parent.collapsedChildren).toEqual([]);
  });

  it('add loop children by addNode', async () => {
    flowDocument.fromJSON(emptyMock);
    const loop = flowOperationService.addFromNode('start_0', {
      id: 'test-loop',
      type: 'loop',
    });
    expect(loop.id).toEqual('test-loop');
    const loopJson = flowDocument.toJSON();
    const child = flowOperationService.addNode(
      {
        id: 'loop-child1',
        type: 'test',
      },
      {
        parent: loop,
        index: 0,
      },
    ) as FlowNodeEntity;

    expect(child.id).toEqual('loop-child1');
    expect(child.pre?.id).toEqual('$loopRightEmpty$test-loop');
    expect(child.parent?.id).toEqual('$block$test-loop');
    const str = flowDocument.toString();

    await historyService.undo();
    expect(flowDocument.toJSON()).toEqual(loopJson);

    await historyService.redo();
    expect(flowDocument.toString()).toEqual(str);
  });

  it('add dynamic split children by addNode', async () => {
    flowDocument.fromJSON(baseMock);
    const child = flowOperationService.addNode(
      {
        id: 'block_test',
        type: 'block',
      },
      {
        parent: 'dynamicSplit_0',
        index: 0,
      },
    ) as FlowNodeEntity;

    expect(child.id).toEqual('block_test');
    expect(child.pre?.id).toBeUndefined();
    expect(child.next?.id).toBe('block_0');
    expect(child.originParent?.id).toBe('dynamicSplit_0');
    expect(child.parent?.id).toBe('$inlineBlocks$dynamicSplit_0');
    const str = flowDocument.toString();

    await historyService.undo();
    expect(flowDocument.toJSON()).toEqual(baseMock);

    await historyService.redo();
    expect(flowDocument.toString()).toEqual(str);
  });

  it('add block children by addNode', async () => {
    flowDocument.fromJSON(baseMock);
    const child = flowOperationService.addNode(
      {
        id: 'test',
        type: 'test',
      },
      {
        parent: 'block_0',
        index: 0,
      },
    ) as FlowNodeEntity;

    expect(child.id).toEqual('test');
    expect(child.pre?.id).toBe('$blockOrderIcon$block_0');
    expect(child.next?.id).toBeUndefined();
    expect(child.originParent?.id).toBeUndefined();
    expect(child.parent?.id).toBe('block_0');
    const str = flowDocument.toString();

    await historyService.undo();
    expect(flowDocument.toJSON()).toEqual(baseMock);

    await historyService.redo();
    expect(flowDocument.toString()).toEqual(str);
  });
});
