/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { TransformData } from '@flowgram.ai/core';

import { FlowDocument } from '../src/flow-document';
import { baseMockAddNode } from './flow.mock';
import { createDocumentContainer } from './flow-document-container.mock';

interface BlockData {
  children: string[];
  pre?: string;
  next?: string;
  depth: number;
  childrenSize: number;
}

const blockData: { [key: string]: BlockData } = {
  root: {
    children: ['start_0', 'dynamicSplit_0', 'end_0'],
    pre: undefined,
    next: undefined,
    depth: 0,
    childrenSize: 10,
  },
  start_0: {
    children: [],
    next: 'dynamicSplit_0',
    pre: undefined,
    depth: 1,
    childrenSize: 0,
  },
  dynamicSplit_0: {
    children: ['$blockIcon$dynamicSplit_0', '$inlineBlocks$dynamicSplit_0'],
    next: 'end_0',
    pre: 'start_0',
    depth: 1,
    childrenSize: 7,
  },
  $blockIcon$dynamicSplit_0: {
    children: [],
    next: '$inlineBlocks$dynamicSplit_0',
    pre: undefined,
    depth: 2,
    childrenSize: 0,
  },
  $inlineBlocks$dynamicSplit_0: {
    children: ['block_0', 'block_1'],
    pre: '$blockIcon$dynamicSplit_0',
    next: undefined,
    depth: 2,
    childrenSize: 5,
  },
  block_0: {
    children: ['$blockOrderIcon$block_0'],
    depth: 3,
    pre: undefined,
    next: 'block_1',
    childrenSize: 1,
  },
  $blockOrderIcon$block_0: {
    children: [],
    depth: 4,
    pre: undefined,
    next: undefined,
    childrenSize: 0,
  },
  block_1: {
    children: ['$blockOrderIcon$block_1', 'noop_0'],
    depth: 3,
    pre: 'block_0',
    next: undefined,
    childrenSize: 2,
  },
  $blockOrderIcon$block_1: {
    children: [],
    next: 'noop_0',
    depth: 4,
    pre: undefined,
    childrenSize: 0,
  },
  noop_0: {
    children: [],
    pre: '$blockOrderIcon$block_1',
    next: undefined,
    depth: 4,
    childrenSize: 0,
  },
  end_0: {
    children: [],
    pre: 'dynamicSplit_0',
    next: undefined,
    depth: 1,
    childrenSize: 0,
  },
};
describe('flow-node-entity', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  beforeEach(() => {
    container = createDocumentContainer();
    container.get(FlowDocument).fromJSON(baseMockAddNode);
    document = container.get<FlowDocument>(FlowDocument);
  });
  it('get children', () => {
    const currentBlockData: { [key: string]: BlockData } = {};
    document.traverse((node, depth) => {
      currentBlockData[node.id] = {
        children: node.children.map((b) => b.id),
        depth,
        next: node.next?.id,
        pre: node.pre?.id,
        childrenSize: node.allChildren.length,
      };
    });
    expect(currentBlockData).toEqual(blockData);
  });
  it('flow node delete', () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const node = document.getNode('$blockOrderIcon$block_1')!;
    node.dispose();
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
    // transform 数据还在
    expect(node.getData(TransformData)).toBeDefined();
  });
});
