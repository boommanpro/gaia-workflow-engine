/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRegistry, FlowNodeBaseType, getDefaultSpacing } from '@flowgram.ai/document';

import {
  drawStraightAdder,
  drawStraightLine,
  getInputPoint,
  getOutputPoint,
} from './utils/transition';
import { insideSlot } from './utils/node';
import { getAllPortsMiddle } from './utils/layout';
import { createSlotFromJSON } from './utils/create';
import { SlotInlineBlocksRegistry, SlotIconRegistry } from './extends';
import {
  SLOT_NODE_LAST_SPACING,
  SLOT_SPACING,
  SLOT_START_DISTANCE,
  SlotSpacingKey,
} from './constants';

export const SlotRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.SLOT,
  extend: 'block',
  meta: {
    // Slot 节点内部暂时不允许拖拽
    draggable: (node) => !insideSlot(node),
    hidden: true,
    spacing: (node) => getDefaultSpacing(node.entity, SlotSpacingKey.SLOT_SPACING, SLOT_SPACING),
    padding: (node) => ({
      left: 0,
      right: node.collapsed
        ? getDefaultSpacing(node.entity, SlotSpacingKey.SLOT_START_DISTANCE, SLOT_START_DISTANCE)
        : 0,
      bottom: !insideSlot(node.entity) && node.isLast ? SLOT_NODE_LAST_SPACING : 0,
      top: 0,
    }),
    copyDisable: false,
    defaultExpanded: false,
  },
  /**
   * 业务通常需要重载方法
   */
  onCreate: createSlotFromJSON,
  getLines: (transition) => [
    ...(!insideSlot(transition.entity) ? drawStraightLine(transition) : []),
  ],
  getLabels: (transition) => [
    ...(!insideSlot(transition.entity) ? drawStraightAdder(transition) : []),
  ],
  getInputPoint,
  getOutputPoint,
  onAfterUpdateLocalTransform(transform) {
    const { isVertical } = transform.entity;

    if (!isVertical) {
      return;
    }

    const icon = transform.firstChild;
    const inlineBlocks = transform.lastChild;

    if (!icon || !inlineBlocks) {
      return;
    }

    const iconSize = icon.localBounds.height;
    const inlineBlocksSize = inlineBlocks.localBounds.height;

    if (transform.collapsed || !inlineBlocks) {
      return;
    }

    // 所有 Ports 的中间点
    const portsMiddle = getAllPortsMiddle(inlineBlocks);

    icon.entity.clearMemoLocal();
    inlineBlocks.entity.clearMemoLocal();

    if (iconSize / 2 + portsMiddle > inlineBlocksSize || !inlineBlocks.children.length) {
      icon.transform.update({
        position: { x: icon.transform.position.x, y: 0 },
      });
      inlineBlocks.transform.update({
        position: {
          x: inlineBlocks.transform.position.x,
          y: Math.max(iconSize / 2 - inlineBlocksSize / 2, 0),
        },
      });

      return;
    }

    inlineBlocks.transform.update({
      position: { x: inlineBlocks.transform.position.x, y: 0 },
    });
    icon?.transform.update({
      position: {
        x: icon.transform.position.x,
        y: Math.max(portsMiddle - iconSize / 2, 0), // 所有 port 的中间点
      },
    });
  },
  extendChildRegistries: [SlotIconRegistry, SlotInlineBlocksRegistry],
};
