/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlowDocument, FlowNodeEntity } from '@flowgram.ai/editor';

import { getNodeChildrenIds } from '../utils';
import { createContainer } from '../create-container';
import { FlowOperationService } from '../../src/types';
import { baseMock } from '../../__mocks__/flow.mock';

describe('flow-operation-service', () => {
  let flowOperationService: FlowOperationService;
  let flowDocument: FlowDocument;
  beforeEach(() => {
    const container = createContainer({});
    flowDocument = container.get(FlowDocument);
    flowOperationService = container.get(FlowOperationService);
    flowDocument.fromJSON(baseMock);
  });

  it('addFromNode', () => {
    const type = 'test';
    const nodeJSON = {
      id: 'test',
      type,
    };
    const added = flowOperationService.addFromNode('start_0', nodeJSON);
    const node = flowDocument.getNode(added.id) as FlowNodeEntity;
    expect(node).toBe(added);
    expect(added.id).toEqual(nodeJSON.id);
  });

  it('deleteNode', () => {
    const id = 'dynamicSplit_0';
    flowOperationService.deleteNode(id);
    const node = flowDocument.getNode(id);
    expect(node).toBeUndefined();
  });

  it('delete block by deleteNode', () => {
    const id = 'block_0';
    flowOperationService.deleteNode(id);
    const node = flowDocument.getNode(id);
    expect(node).toBeUndefined();
  });

  it('addNode', () => {
    const nodeJSON = {
      id: 'test-node',
      type: 'test',
    };
    const parent = flowDocument.getNode('start_0');
    const added = flowOperationService.addNode(nodeJSON, {
      parent,
    });
    const entity = flowDocument.getNode(added.id);
    expect(entity).toBe(added);
    expect(entity?.parent).toBe(parent);
    expect(entity?.originParent).toBeUndefined();
  });

  it('addBlock', () => {
    const target = flowDocument.getNode('dynamicSplit_0') as FlowNodeEntity;
    const added = flowOperationService.addBlock(target, {
      id: 'test-block',
      type: 'test-block',
    });
    const entity = flowDocument.getNode(added.id);
    expect(entity).toBe(added);
    expect(entity?.parent?.id).toEqual('$inlineBlocks$dynamicSplit_0');
    expect(entity?.originParent).toBe(target);
  });

  it('deleteNodes', () => {
    const parent = flowDocument.getNode('start_0');
    const added = flowOperationService.addNode(
      {
        id: 'delete-node',
        type: 'test',
      },
      {
        parent,
      },
    );

    flowOperationService.deleteNodes([added]);
    expect(flowDocument.getNode(added.id)).toBeUndefined();
  });

  it('createGroup ungroup', () => {
    const node1 = flowOperationService.addFromNode('start_0', {
      id: 'add',
      type: 'add',
    });
    const node2 = flowDocument.getNode('dynamicSplit_0') as FlowNodeEntity;
    // TODO 这里需要优化，理论上createGroup不应该依赖渲染，现在createGroup内部有一个index的校验，但index在transformer中被设置对了
    flowDocument.transformer.refresh();
    const group = flowOperationService.createGroup([node1, node2]) as FlowNodeEntity;
    const root = flowDocument.getNode('root');
    expect(root?.collapsedChildren.map(c => c.id)).toEqual(['start_0', group.id, 'end_0']);
    expect(group.collapsedChildren.map(c => c.id)).toEqual([node1.id, node2.id]);
    flowOperationService.ungroup(group);
    expect(root?.collapsedChildren.map(c => c.id)).toEqual([
      'start_0',
      'add',
      'dynamicSplit_0',
      'end_0',
    ]);
  });

  it('moveNode', () => {
    flowOperationService.moveNode('block_1', {
      index: 2,
    });
    const split = flowDocument.getNode('dynamicSplit_0');
    expect(getNodeChildrenIds(split, true)).toEqual(['block_0', 'block_2', 'block_1']);
  });
});
