/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowDocument } from '@flowgram.ai/document';

import { findSelectedNodes } from '../../src/utils/find-selected-nodes';
import { FLOW_SELECTED_NODES } from '../../__mocks__/flow-selected-nodes.mock';
import { createDocument } from '../../__mocks__/flow-document-container.mock';

function selectNodes(document: FlowDocument, nodeIds: string[]): string[] {
  const nodes = nodeIds.map(n => document.getNode(n));
  return findSelectedNodes(nodes).map(n => n.id);
}

describe('find selected nodes', () => {
  let document: FlowDocument;
  beforeEach(() => {
    document = createDocument();
    document.fromJSON(FLOW_SELECTED_NODES);
  });
  /**
   * 同分支选择
   */
  it('some branch', () => {
    const res = selectNodes(document, [
      'createRecord_47e8fe1dfc3',
      'createRecord_32dcdd10274',
      'exclusiveSplit_a5579b3997d',
    ]);
    expect(res).toEqual([
      'createRecord_47e8fe1dfc3',
      'createRecord_32dcdd10274',
      'exclusiveSplit_a5579b3997d',
    ]);
  });
  /**
   * 同分支下再选择子节点
   */
  it('some branch with sub branch', () => {
    const res = selectNodes(document, [
      'createRecord_47e8fe1dfc3',
      'createRecord_32dcdd10274',
      'createRecord_b57b00eee94', // 这个属于 "exclusiveSplit_a5579b3997d" 的子节点
    ]);
    expect(res).toEqual([
      'createRecord_47e8fe1dfc3',
      'createRecord_32dcdd10274',
      'exclusiveSplit_a5579b3997d',
    ]);
  });
  /**
   * 跨分支选择
   */
  it('different branch', () => {
    const res = selectNodes(document, ['createRecord_897b61c55f3', 'createRecord_b57b00eee94']);
    expect(res).toEqual(['exclusiveSplit_30baf8b1da0']);
    const res2 = selectNodes(document, ['createRecord_897b61c55f3', 'createRecord_47e8fe1dfc3']);
    expect(res2).toEqual(['exclusiveSplit_30baf8b1da0']);
  });
});
