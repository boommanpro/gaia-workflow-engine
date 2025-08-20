/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { type FlowDocumentJSON, type FlowNodeJSON } from '../src/typings';
import { FlowDocument } from '../src';
import { baseMock, baseMockAddBranch, baseMockAddNode, baseMockNodeEnd } from './flow.mock';
import { createDocumentContainer } from './flow-document-container.mock';

describe('flow-document', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  beforeEach(() => {
    container = createDocumentContainer();
    container.get(FlowDocument).fromJSON(baseMockAddNode);
    document = container.get<FlowDocument>(FlowDocument);
  });
  it('fromJSON', () => {
    document = container.get<FlowDocument>(FlowDocument);
    expect(document.root.childrenLength).toEqual(3);
    expect(document.root.children[0].parent).toEqual(document.root);
    expect(document.getNode('$blockOrderIcon$block_0')!.originParent).toEqual(
      document.getNode('dynamicSplit_0')
    );
    expect(document.getNode('$blockOrderIcon$block_0')!.parent).toEqual(
      document.getNode('block_0')
    );
    expect(document.toString()).toEqual(`root
|-- start_0
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_0
|-------- $blockOrderIcon$block_0
|------ block_1
|-------- $blockOrderIcon$block_1
|-------- noop_0
|-- end_0`);
  });
  it('fromJSON is equal toJSON', () => {
    function normalizeNode(node: FlowNodeJSON): FlowNodeJSON {
      return {
        ...node,
        type: node.type || 'block',
        blocks: node.blocks?.map((b) => normalizeNode(b)),
      };
    }
    function jsonEqual(from: FlowDocumentJSON, to: FlowDocumentJSON) {
      const nodes = to.nodes.map((node) => normalizeNode(node));
      expect(from.nodes).toEqual(nodes);
    }
    document.fromJSON(baseMock);
    jsonEqual(document.toJSON(), baseMock);
    document.fromJSON(baseMockAddNode);
    jsonEqual(document.toJSON(), baseMockAddNode);
    document.fromJSON(baseMockAddBranch);
    jsonEqual(document.toJSON(), baseMockAddBranch);

    // eslint-disable-next-line guard-for-in
    // for (const key in dataList) {
    //   const json = (dataList as any)[key]
    //   document.fromJSON(json)
    //   jsonEqual(document.toJSON(), json)
    // }
  });
  it('fromJSON with cache', () => {
    // Step1: 导入初始结构
    document.fromJSON(baseMock);
    const originNodes = document.getAllNodes().slice();
    expect(document.size).toEqual(10);
    // Step2: 同一个数据，结构未变化，数据未变化
    document.fromJSON(baseMock);
    expect(document.size).toEqual(10);
    const nodes2 = document.getAllNodes().slice();
    expect(originNodes).toEqual(nodes2);
    // Step3: 添加一个节点，结构产生变化
    document.fromJSON(baseMockAddNode);
    expect(document.size).toEqual(11);
    const nodes3 = document.getAllNodes().slice();
    // 新添加的节点会放在最后边，前面所有的 instance 都不变
    expect(nodes3.slice(0, -1)).toEqual(originNodes);
    // Step4: 添加一个块
    document.fromJSON(baseMockAddBranch);
    expect(document.size).toEqual(13); // 会添加两个节点
    const nodes4 = document.getAllNodes().slice();
    expect(nodes4.slice(0, -3)).toEqual(originNodes);
    // Step5: 跑最初始的数据，结构变化，节点被删除了两个
    document.fromJSON(baseMock);
    expect(document.size).toEqual(10);
    const nodes5 = document.getAllNodes().slice();
    expect(nodes5).toEqual(originNodes);
  });
  // it('remove node from JSON', () => {
  //   document.fromJSON(dataList['split-nested']);
  //   expect(document.size).toBeGreaterThan(40);
  //   document.fromJSON(dataList.empty);
  //   expect(document.size).toEqual(3);
  // });
  it('add base node', () => {
    document.addFromNode('start_0', { id: 'new_noop', type: 'noop' });
    expect(document.toString()).toEqual(`root
|-- start_0
|-- new_noop
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_0
|-------- $blockOrderIcon$block_0
|------ block_1
|-------- $blockOrderIcon$block_1
|-------- noop_0
|-- end_0`);
    expect(document.size).toEqual(12);
  });
  it('add split node', () => {
    document.addFromNode('dynamicSplit_0', {
      id: 'new_split',
      type: 'dynamicSplit',
      blocks: [{ id: 'b1' }, { id: 'b2' }],
    });
    expect(document.toString()).toEqual(`root
|-- start_0
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_0
|-------- $blockOrderIcon$block_0
|------ block_1
|-------- $blockOrderIcon$block_1
|-------- noop_0
|-- new_split
|---- $blockIcon$new_split
|---- $inlineBlocks$new_split
|------ b1
|-------- $blockOrderIcon$b1
|------ b2
|-------- $blockOrderIcon$b2
|-- end_0`);
    expect(document.size).toEqual(18);
    document.addFromNode('block_1', {
      id: 'new_split2',
      type: 'dynamicSplit',
      blocks: [{ id: 'nb1' }, { id: 'nb2' }],
    });
    expect(document.toString()).toMatchSnapshot();
    expect(document.size).toEqual(25);
  });
  it('removeNode', () => {
    document.removeNode('dynamicSplit_0');
    expect(document.toString()).toEqual(`root
|-- start_0
|-- end_0`);
    expect(document.size).toEqual(3);
  });
  it('removeLeafBlock', () => {
    document.removeNode('noop_0');
    expect(document.toString()).toEqual(`root
|-- start_0
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_0
|-------- $blockOrderIcon$block_0
|------ block_1
|-------- $blockOrderIcon$block_1
|-- end_0`);
  });
  it('removeBlockFistChild', () => {
    document = container.get<FlowDocument>(FlowDocument);
    document.removeNode('$blockOrderIcon$block_1');
    expect(document.toString()).toEqual(`root
|-- start_0
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_0
|-------- $blockOrderIcon$block_0
|------ block_1
|-------- noop_0
|-- end_0`);
  });
  it('removeBlockWithChild', () => {
    document.removeNode('block_1');
    expect(document.toString()).toEqual(`root
|-- start_0
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_0
|-------- $blockOrderIcon$block_0
|-- end_0`);
  });
  it('flow node type changed', () => {
    document.fromJSON({
      nodes: [
        {
          id: 'start_0',
          type: 'start',
          blocks: [],
        },
        {
          id: 'dynamicSplit_0',
          type: 'noop', // Change node type to noop
        },
        {
          id: 'end_0',
          type: 'dynamicSplit', // Change node type to dynamicSplit
          blocks: [{ id: 'block_0' }, { id: 'block_1' }],
        },
      ],
    });
    expect(document.toString()).toEqual(`root
|-- start_0
|-- dynamicSplit_0
|-- end_0
|---- $blockIcon$end_0
|---- $inlineBlocks$end_0
|------ block_0
|-------- $blockOrderIcon$block_0
|------ block_1
|-------- $blockOrderIcon$block_1`);
    expect(document.size).toEqual(10);
  });
  /**
   * 分支移动
   */
  it('flow node move', () => {
    document.fromJSON({
      nodes: [
        {
          id: 'start_0',
          type: 'start',
          blocks: [],
        },
        {
          id: 'end_0',
          type: 'end',
          blocks: [],
        },
        {
          id: 'dynamicSplit_0',
          type: 'dynamicSplit',
          blocks: [{ id: 'block_1' }, { id: 'block_0' }], // swap blocks order
        },
      ],
    });
    expect(document.toString()).toEqual(`root
|-- start_0
|-- end_0
|-- dynamicSplit_0
|---- $blockIcon$dynamicSplit_0
|---- $inlineBlocks$dynamicSplit_0
|------ block_1
|-------- $blockOrderIcon$block_1
|------ block_0
|-------- $blockOrderIcon$block_0`);
  });
  /**
   * 节点结束判断
   */
  it('flow is node end', () => {
    document.fromJSON(baseMockNodeEnd);

    expect(document.getNode('dynamicSplit_0')?.isNodeEnd).toBeTruthy();
    expect(document.getNode('block_0')?.isNodeEnd).toBeTruthy();
    expect(document.getNode('noop_0')?.isNodeEnd).toBeTruthy();
  });
  it('node registry add cache', () => {
    const registry1 = document.getNodeRegistry('start');
    const registry2 = document.getNodeRegistry('start');
    expect(registry1 === registry2).toBeTruthy();
    expect(
      document.getNode('block_0')!.getNodeRegistry() ===
        document.getNode('block_1')!.getNodeRegistry()
    ).toBeTruthy();
    expect(
      document.getNode('block_0')!.getNodeMeta() === document.getNode('block_1')!.getNodeMeta()
    ).toBeTruthy();
  });
  it('document is disposed and call toJSON should throw error', () => {
    document.dispose();
    expect(() => document.toJSON()).toThrowError(/disposed/);
  });
});
