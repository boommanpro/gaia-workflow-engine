/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { baseMockAddBranch } from '../flow.mock';
import { createDocumentContainer } from '../flow-document-container.mock';
import { FlowDocument } from '../../src/flow-document';
import { FlowNodeTransitionData } from '../../src/datas';

describe('flow-node-transition-data', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  const originSetTimeout = setTimeout;
  beforeEach(() => {
    vi.stubGlobal('setTimeout', (fn: any) => {
      fn();
      return 1;
    });
    container = createDocumentContainer();
    document = container.get<FlowDocument>(FlowDocument);
    document.fromJSON(baseMockAddBranch, true);
    document.transformer.refresh();
  });
  afterEach(() => {
    vi.stubGlobal('setTimeout', originSetTimeout);
    document.dispose();
  });

  it('get lines and labels for all nodes', () => {
    const allNodeTransitionInfo: any = {};

    document.getAllNodes().forEach((_node) => {
      const transitionData = _node.getData(FlowNodeTransitionData)!;
      allNodeTransitionInfo[_node.id] = {
        lines: transitionData.lines,
        labels: transitionData.labels,
      };
    });

    expect(allNodeTransitionInfo).toMatchSnapshot();
  });
});
