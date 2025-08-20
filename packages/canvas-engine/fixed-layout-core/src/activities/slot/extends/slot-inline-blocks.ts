/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRegistry, FlowNodeBaseType, getDefaultSpacing } from '@flowgram.ai/document';
import { FlowNodeTransformData } from '@flowgram.ai/document';

import { SlotNodeType } from '../typings';
import {
  SlotSpacingKey,
  SLOT_START_DISTANCE,
  SLOT_PORT_DISTANCE,
  SLOT_BLOCK_PORT_DISTANCE,
} from '../constants';

export const SlotInlineBlocksRegistry: FlowNodeRegistry = {
  type: SlotNodeType.SlotInlineBlocks,
  extend: FlowNodeBaseType.BLOCK,
  meta: {
    spacing: 0,
    inlineSpacingPre: 0,
    inlineSpacingAfter: 0,
    isInlineBlocks: (node) => !node.isVertical,
  },
  getLines() {
    return [];
  },
  getLabels() {
    return [];
  },
  getChildDelta(child, layout) {
    if (child.entity.isVertical) {
      return { x: 0, y: 0 };
    }
    const preTransform = child.entity.pre?.getData(FlowNodeTransformData);
    if (preTransform) {
      const { localBounds: preBounds } = preTransform;

      return {
        x: 0,
        y: preBounds.bottom + 30,
      };
    }

    return { x: 0, y: 0 };
  },
  /**
   * 控制条件分支居右布局
   */
  getDelta(transform) {
    if (!transform.children.length) {
      return { x: 0, y: 0 };
    }

    const icon = transform.pre;
    if (!icon) {
      return { x: 0, y: 0 };
    }

    const startDistance = getDefaultSpacing(
      transform.entity,
      SlotSpacingKey.SLOT_START_DISTANCE,
      SLOT_START_DISTANCE
    );

    const portDistance = getDefaultSpacing(
      transform.entity,
      SlotSpacingKey.SLOT_PORT_DISTANCE,
      SLOT_PORT_DISTANCE
    );

    const portBlockDistance = getDefaultSpacing(
      transform.entity,
      SlotSpacingKey.SLOT_BLOCK_PORT_DISTANCE,
      SLOT_BLOCK_PORT_DISTANCE
    );

    if (!transform.entity.isVertical) {
      const noChildren = transform?.children?.every?.((_port) => !_port.children.length);
      /**
       * 如果没有 children 的时候，不需要有右侧的间距，避免水平布局的时候 Slot 右侧空间过大。
       */
      if (noChildren) {
        return {
          x: portDistance - icon.localBounds.width / 2,
          y: icon.localBounds.bottom + startDistance,
        };
      }
      return {
        x: portDistance + portBlockDistance - icon.localBounds.width / 2,
        y: icon.localBounds.bottom + startDistance,
      };
    }

    const slotInlineBlockDelta = startDistance + portDistance + portBlockDistance;
    return {
      x: icon.localBounds.right + slotInlineBlockDelta,
      y: -icon.localBounds.height,
    };
  },
};
