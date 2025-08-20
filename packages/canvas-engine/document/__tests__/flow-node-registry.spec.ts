/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createDocumentContainer } from './flow-document-container.mock';
import { FlowDocument, FlowNodeRegistry } from '../src';

function registerNode(doc: FlowDocument, newRegistry: FlowNodeRegistry): FlowNodeRegistry {
  doc.registerFlowNodes(newRegistry);
  return doc.getNodeRegistry(newRegistry.type);
}
const mockRegistries: FlowNodeRegistry[] = [
  {
    type: 'dynamicSplit',
    meta: {},
    onCreate(node, json) {
      return node.document.addInlineBlocks(node, json.blocks || []);
    },
    extendChildRegistries: [
      {
        type: 'blockIcon',
        customKey: 'blockIcon_base',
      },
      {
        type: 'inlineBlocks',
        customKey: 'inlineBlocks_base',
      },
    ],
    onAdd: () => {},
  },
  {
    type: 'a',
    extend: 'dynamicSplit',
  },
  {
    type: 'b',
    extend: 'a',
    extendChildRegistries: [
      {
        type: 'blockIcon',
        customKey: 'blockIcon_from_b',
      },
    ],
  },
  {
    type: 'c',
    extend: 'b',
    extendChildRegistries: [
      {
        type: 'blockIcon',
        customKey: 'blockIcon_from_c',
      },
      {
        type: 'inlineBlocks',
        customKey: 'inlineBlocks_from_c',
      },
    ],
  },
];
describe('flow-node-registry', () => {
  let doc: FlowDocument;
  beforeEach(() => {
    const container = createDocumentContainer();
    doc = container.get<FlowDocument>(FlowDocument);
    doc.registerFlowNodes(...mockRegistries);
  });
  it('extend check', () => {
    expect(doc.getNodeRegistry('dynamicSplit').__extends__).toEqual(undefined);
    expect(doc.getNodeRegistry('a').__extends__).toEqual(['dynamicSplit']);
    expect(doc.getNodeRegistry('b').__extends__).toEqual(['a', 'dynamicSplit']);
    expect(doc.getNodeRegistry('c').__extends__).toEqual(['b', 'a', 'dynamicSplit']);
    expect(doc.isExtend('dynamicSplit', 'dynamicSplit')).toBeFalsy();
    expect(doc.isExtend('a', 'b')).toBeFalsy();
    expect(doc.isExtend('a', 'dynamicSplit')).toBeTruthy();
    expect(doc.isExtend('b', 'dynamicSplit')).toBeTruthy();
    expect(doc.isExtend('b', 'a')).toBeTruthy();
    expect(doc.isExtend('c', 'dynamicSplit')).toBeTruthy();
    expect(doc.isExtend('c', 'b')).toBeTruthy();
    expect(doc.isExtend('c', 'a')).toBeTruthy();
    expect(doc.isTypeOrExtendType('dynamicSplit', 'dynamicSplit')).toBeTruthy();
    expect(doc.isTypeOrExtendType('c', 'a')).toBeTruthy();
  });
  it('base extend', () => {
    expect(doc.getNodeRegistry('a').onAdd).toBeTypeOf('function');
    doc.addNode({
      id: 'a',
      type: 'a',
      parent: doc.root,
    });
    expect(doc.toString()).toEqual(`root
|-- a
|---- $blockIcon$a
|---- $inlineBlocks$a`);
    expect(doc.getNode('$blockIcon$a').getNodeRegistry().customKey).toBe('blockIcon_base');
  });
  it('extend nested', () => {
    expect(doc.getNodeRegistry('b').onAdd).toBeTypeOf('function');
    doc.addNode({
      id: 'b',
      type: 'b',
      parent: doc.root,
    });
    doc.addNode({
      id: 'c',
      type: 'c',
      parent: doc.root,
    });
    expect(doc.toString()).toEqual(`root
|-- b
|---- $blockIcon$b
|---- $inlineBlocks$b
|-- c
|---- $blockIcon$c
|---- $inlineBlocks$c`);
    expect(doc.getNode('$blockIcon$b').getNodeRegistry().customKey).toBe('blockIcon_from_b');
    expect(doc.getNode('$inlineBlocks$b').getNodeRegistry().customKey).toBe('inlineBlocks_base');
    expect(doc.getNode('$blockIcon$c').getNodeRegistry().customKey).toBe('blockIcon_from_c');
    expect(doc.getNode('$inlineBlocks$c').getNodeRegistry().customKey).toBe('inlineBlocks_from_c');
  });
});
