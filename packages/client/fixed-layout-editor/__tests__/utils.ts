/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocument, FlowNodeEntity } from '@flowgram.ai/editor';

export function getNodeChildrenIds(node: FlowNodeEntity | undefined, isBranch: boolean = false) {
  if (!node) {
    return [];
  }

  if (isBranch) {
    return getNodeChildrenIds(
      node.collapsedChildren.find(c => c.id === `$inlineBlocks$${node.id}`),
    );
  }

  return node?.collapsedChildren.map(c => c.id);
}

export function getRootChildrenIds(flowDocument: FlowDocument) {
  return getNodeChildrenIds(flowDocument.getNode('root'));
}
