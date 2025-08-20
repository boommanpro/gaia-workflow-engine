/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowNodeEntity } from '@flowgram.ai/editor';

import { getNodeChildrenIds } from '../../utils';
import { createHistoryContainer } from '../../create-container';
import { baseMock } from '../../../__mocks__/flow.mock';

describe('history-operation-service moveNode', () => {
  const { flowDocument, flowOperationService, historyService } = createHistoryContainer();

  beforeEach(() => {
    flowDocument.fromJSON(baseMock);
  });

  it('move block with parent', async () => {
    flowOperationService.moveNode('block_1', {
      parent: '$inlineBlocks$dynamicSplit_0',
      index: 2,
    });
    const split = flowDocument.getNode('dynamicSplit_0');
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_2', 'block_1']);

    await historyService.undo();
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_1', 'block_2']);
  });

  it('move block without parent', async () => {
    flowOperationService.moveNode('block_1', {
      index: 2,
    });
    const split = flowDocument.getNode('dynamicSplit_0');
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_2', 'block_1']);

    await historyService.undo();
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_1', 'block_2']);
  });

  it('move block with index', async () => {
    flowOperationService.moveNode('block_0', {
      index: 1,
    });
    const split = flowDocument.getNode('dynamicSplit_0');
    expect(getNodeChildrenIds(split, true)).toEqual(['block_1', 'block_0', 'block_2']);

    await historyService.undo();
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_1', 'block_2']);
  });

  it('move block without index', async () => {
    flowOperationService.moveNode('block_1');
    const split = flowDocument.getNode('dynamicSplit_0');
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_2', 'block_1']);

    await historyService.undo();
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_1', 'block_2']);
  });

  it('move block to other parent', async () => {
    flowDocument.addFromNode('dynamicSplit_0', {
      id: 'dynamicSplit_1',
      type: 'dynamicSplit',
      blocks: [{ id: 'block_3' }, { id: 'block_4' }, { id: 'block_5' }],
    });

    flowOperationService.moveNode('block_1', {
      parent: '$inlineBlocks$dynamicSplit_1',
      index: 1,
    });
    const split = flowDocument.getNode('dynamicSplit_0');
    const split1 = flowDocument.getNode('dynamicSplit_1');
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_2']);
    expect(getNodeChildrenIds(split1, true)).toEqual(['block_3', 'block_1', 'block_4', 'block_5']);

    await historyService.undo();
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_1', 'block_2']);
    expect(getNodeChildrenIds(split1, true)).toEqual(['block_3', 'block_4', 'block_5']);
  });

  it('move block to other parent which has no children', async () => {
    flowDocument.addFromNode('dynamicSplit_0', {
      id: 'dynamicSplit_1',
      type: 'dynamicSplit',
      blocks: [],
    });

    flowOperationService.moveNode('block_1', {
      parent: '$inlineBlocks$dynamicSplit_1',
    });
    const split = flowDocument.getNode('dynamicSplit_0');
    const split1 = flowDocument.getNode('dynamicSplit_1');

    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_2']);
    expect(getNodeChildrenIds(split1, true)).toEqual(['block_1']);

    expect(historyService.canUndo()).toBe(true);
  });

  it('move node without parent and index', async () => {
    const root = flowDocument.getNode('root');
    flowOperationService.moveNode('start_0');
    expect(getNodeChildrenIds(root)).toEqual(['dynamicSplit_0', 'end_0', 'start_0']);

    await historyService.undo();
    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'dynamicSplit_0', 'end_0']);
  });

  it('move node with parent and without index', async () => {
    const root = flowDocument.getNode('root');
    const block0 = flowDocument.getNode('block_0');

    flowOperationService.addNode(
      { id: 'test0', type: 'test' },
      {
        parent: block0,
      }
    );

    flowDocument.addFromNode('start_0', {
      type: 'test',
      id: 'test1',
    });

    flowOperationService.moveNode('test1', { parent: 'block_0' });

    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'dynamicSplit_0', 'end_0']);
    expect(getNodeChildrenIds(block0)).toEqual(['$blockOrderIcon$block_0', 'test0', 'test1']);

    await historyService.undo();
    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'test1', 'dynamicSplit_0', 'end_0']);
    expect(getNodeChildrenIds(block0)).toEqual(['$blockOrderIcon$block_0', 'test0']);
  });

  it('move node with parent and index', async () => {
    const root = flowDocument.getNode('root');
    flowDocument.addFromNode('dynamicSplit_0', {
      type: 'test',
      id: 'test',
    });

    // 向后移动
    flowOperationService.moveNode('dynamicSplit_0', {
      index: 2,
    });
    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'test', 'dynamicSplit_0', 'end_0']);

    // 向前移动
    flowOperationService.moveNode('dynamicSplit_0', {
      index: 1,
    });
    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'dynamicSplit_0', 'test', 'end_0']);

    await historyService.undo();
    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'test', 'dynamicSplit_0', 'end_0']);

    await historyService.undo();
    expect(getNodeChildrenIds(root)).toEqual(['start_0', 'dynamicSplit_0', 'test', 'end_0']);
  });

  it('move node to group', async () => {
    const group = flowOperationService.createGroup([
      flowDocument.getNode('dynamicSplit_0') as FlowNodeEntity,
    ]) as FlowNodeEntity;
    const root = flowDocument.getNode('root');
    flowOperationService.moveNode('start_0', {
      parent: group,
    });
    expect(getNodeChildrenIds(root)).toEqual([group.id, 'end_0']);
    expect(getNodeChildrenIds(group)).toEqual(['dynamicSplit_0', 'start_0']);

    await historyService.undo();
    expect(getNodeChildrenIds(root)).toEqual(['start_0', group.id, 'end_0']);
    expect(getNodeChildrenIds(group)).toEqual(['dynamicSplit_0']);
  });
});
