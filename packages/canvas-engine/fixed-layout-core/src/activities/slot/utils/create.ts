/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeBaseType } from '@flowgram.ai/document';
import { type FlowNodeEntity } from '@flowgram.ai/document';
import { FlowNodeJSON } from '@flowgram.ai/document';

import { SlotNodeType } from '../typings';

// Slot 样例数据
// const mock = {
//   type: 'slot',
//   id: 'reactor_parent',
//   blocks: [
//     {
//       id: 'port_LnSdK',
//       blocks: [{ type: 'Slot', id: 'reactor_child' }],
//     },
//     {
//       id: 'port_60X7U',
//     },
//     {
//       id: 'port_JWhcm',
//     },
//     {
//       id: 'port_scHWa',
//     },
//   ],
// };

/**
 * 创建 Slot 子节点
 * - Slot
 *  - SlotBlockIcon
 *  - SlotInlineBlocks
 *    - SlotBlock 1
 *        - SlotBlockIcon 1
 *          - ChildSlot 1
 *          - ChildSlot 2
 *    - SlotBlock 2
 *
 * 范例数据：
 * {
 *  type: 'Slot',
 *  id: 'reactor_parent',
 *  blocks: [
 *    {
 *      id: 'port_LnSdK',
 *      blocks: [{ type: 'Slot', id: 'reactor_child' }],
 *    },
 *    {
 *      id: 'port_60X7U',
 *    }
 *  ],
 * }
 *
 */
export const createSlotFromJSON = (node: FlowNodeEntity, json: FlowNodeJSON): FlowNodeEntity[] => {
  const { document } = node;

  const addedNodes: FlowNodeEntity[] = [];

  // 块列表开始节点，用来展示块的按钮
  const blockIconNode = document.addNode({
    id: `$slotIcon$${node.id}`,
    type: FlowNodeBaseType.BLOCK_ICON,
    originParent: node,
    parent: node,
  });
  const inlineBlocksNode = document.addNode({
    id: `$slotInlineBlocks$${node.id}`,
    type: SlotNodeType.SlotInlineBlocks,
    originParent: node,
    parent: node,
  });
  addedNodes.push(blockIconNode);
  addedNodes.push(inlineBlocksNode);

  const portJSONList = json.blocks || [];

  portJSONList.forEach((_portJSON) => {
    const port = document.addNode({
      type: SlotNodeType.SlotBlock,
      ..._portJSON,
      originParent: node,
      parent: inlineBlocksNode,
    });
    addedNodes.push(port);

    (_portJSON.blocks || []).forEach((_portChild) => {
      document.addNode(
        {
          type: SlotNodeType.Slot,
          ..._portChild,
          parent: port,
        },
        addedNodes
      );
    });
  });

  return addedNodes;
};
