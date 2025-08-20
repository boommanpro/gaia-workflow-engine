/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  type FlowNodeRegistry,
  FlowNodeSplitType,
  FlowNodeBaseType,
  FlowNodeJSON,
  FlowNodeEntity,
} from '@flowgram.ai/document';

/**
 * - simpleSplit:  (最原始的 id)
 *  blockIcon
 *  inlineBlocks
 *    node1
 *    node2
 */
export const SimpleSplitRegistry: FlowNodeRegistry = {
  type: FlowNodeSplitType.SIMPLE_SPLIT,
  extend: FlowNodeSplitType.DYNAMIC_SPLIT,
  onBlockChildCreate(
    originParent: FlowNodeEntity,
    blockData: FlowNodeJSON,
    addedNodes: FlowNodeEntity[] = [] // 新创建的节点都要存在这里
  ) {
    const { document } = originParent;
    const parent = document.getNode(`$inlineBlocks$${originParent.id}`);
    const realBlock = document.addNode(
      {
        ...blockData,
        type: blockData.type || FlowNodeBaseType.BLOCK,
        parent,
      },
      addedNodes
    );
    addedNodes.push(realBlock);
    return realBlock;
  },
  // addChild(node, json, options = {}) {
  //   const { index } = options;
  //   const document = node.document;
  //   return document.addBlock(node, json, undefined, undefined, index);
  // }
};
