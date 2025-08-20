/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { baseMockAddNode, baseMockAddBranch } from '../flow.mock';
import { createDocumentContainer } from '../flow-document-container.mock';
import { FlowOperationBaseService, FlowDocument, OperationType, OnNodeMoveEvent } from '../../src';

describe('flow-operation-base-service', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  let flowOperationService: FlowOperationBaseService;
  beforeEach(() => {
    container = createDocumentContainer();
    document = container.get(FlowDocument);
    document.fromJSON(baseMockAddNode);
    flowOperationService = container.get<FlowOperationBaseService>(FlowOperationBaseService);
  });

  it('addFromNode deleteFromNode', () => {
    const json = document.toJSON();
    const value = {
      fromId: 'start_0',
      data: {
        id: 'test',
        type: 'noop',
      },
    };
    flowOperationService.apply({
      type: OperationType.addFromNode,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.deleteFromNode,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('addBlock deleteBlock', () => {
    const json = document.toJSON();
    const value = {
      targetId: 'dynamicSplit_0',
      blockData: {
        id: 'test',
      },
    };
    flowOperationService.apply({
      type: OperationType.addBlock,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.deleteBlock,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('addBlock deleteBlock by index', () => {
    const json = document.toJSON();
    const value = {
      targetId: 'dynamicSplit_0',
      blockData: {
        id: 'test',
      },
      index: 1,
    };
    flowOperationService.apply({
      type: OperationType.addBlock,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.deleteBlock,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('moveNodes', () => {
    const value = {
      fromId: 'block_1',
      toId: 'start_0',
      nodeIds: ['noop_0'],
    };
    flowOperationService.apply({
      type: OperationType.moveNodes,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.moveNodes,
      value: {
        ...value,
        fromId: 'start_0',
        toId: 'block_1',
      },
    });
    expect(document.toJSON()).matchSnapshot();
    // expect(document.toJSON()).toEqual(json);
  });

  it('moveBlock', () => {
    document.fromJSON(baseMockAddBranch);
    const json = document.toJSON();

    flowOperationService.apply({
      type: OperationType.moveBlock,
      value: {
        nodeId: 'block_0',
        fromParentId: '$inlineBlocks$dynamicSplit_0',
        fromIndex: 0,
        toParentId: '$inlineBlocks$dynamicSplit_0',
        toIndex: 1,
      },
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.moveBlock,
      value: {
        nodeId: 'block_0',
        fromParentId: '$inlineBlocks$dynamicSplit_0',
        fromIndex: 1,
        toParentId: '$inlineBlocks$dynamicSplit_0',
        toIndex: 0,
      },
    });
    expect(document.toJSON()).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('dragNodes', () => {
    document.fromJSON(baseMockAddBranch);

    flowOperationService.dragNodes({
      dropNode: document.getNode('block_1')!,
      nodes: [document.getNode('block_0')!],
    });
    expect(document.toJSON()).matchSnapshot();

    flowOperationService.dragNodes({
      dropNode: document.getNode('block_1')!,
      nodes: [document.getNode('block_2')!],
    });
    expect(document.toJSON()).matchSnapshot();
  });

  it('moveChildNodes', () => {
    document.fromJSON(baseMockAddBranch);
    const json = document.toJSON();

    flowOperationService.apply({
      type: OperationType.moveChildNodes,
      value: {
        nodeIds: ['block_0', 'block_1'],
        fromParentId: '$inlineBlocks$dynamicSplit_0',
        fromIndex: 0,
        toParentId: '$inlineBlocks$dynamicSplit_0',
        toIndex: 1,
      },
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.moveChildNodes,
      value: {
        nodeIds: ['block_0', 'block_1'],
        fromParentId: '$inlineBlocks$dynamicSplit_0',
        fromIndex: 1,
        toParentId: '$inlineBlocks$dynamicSplit_0',
        toIndex: 0,
      },
    });
    expect(document.toJSON()).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('addNodes deleteNodes', () => {
    const json = document.toJSON();
    const value = {
      fromId: 'start_0',
      nodes: [
        {
          id: 'test1',
          type: 'noop',
        },
        {
          id: 'test2',
          type: 'noop',
        },
      ],
    };
    flowOperationService.apply({
      type: OperationType.addNodes,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.deleteNodes,
      value,
    });
    expect(document.toJSON()).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('addChildNode deleteChildNode', () => {
    const json = document.toJSON();
    const value = {
      parentId: 'noop_0',
      data: {
        id: 'test-node',
      },
      index: 0,
    };
    flowOperationService.apply({
      type: OperationType.addChildNode,
      value,
    });
    expect(document.getNode('noop_0')?.children.map((c) => c.toJSON())).matchSnapshot();
    flowOperationService.apply({
      type: OperationType.deleteChildNode,
      value,
    });
    expect(document.getNode('noop_0')?.children.map((c) => c.toJSON())).matchSnapshot();
    expect(document.toJSON()).toEqual(json);
  });

  it('addNode', () => {
    const fn = vi.fn();
    flowOperationService.onNodeAdd(fn);
    const child = flowOperationService.addNode(
      {
        id: 'test',
        type: 'test',
      },
      {
        parent: 'root',
        index: 1,
        hidden: true,
      }
    );
    expect(child.id).toEqual('test');
    expect(child.pre?.id).toEqual('start_0');
    expect(child.next?.id).toEqual('dynamicSplit_0');
    expect(child.hidden).toEqual(true);
    expect(fn).toBeCalledTimes(1);
  });

  it('moveNode should fire event', () => {
    let event: OnNodeMoveEvent;

    flowOperationService.onNodeMove((e) => {
      event = e;
      expect(event.node.id === 'noop_0');
      expect(event.fromIndex === 1);
      expect(event.toParent.id === 'block_0');
      expect(event.toIndex === 1);
    });
    flowOperationService.moveNode('noop_0', { parent: 'block_0' });
  });
});
