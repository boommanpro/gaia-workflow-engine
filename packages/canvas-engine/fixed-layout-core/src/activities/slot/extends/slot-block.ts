/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { mean } from 'lodash-es';
import {
  FlowNodeRegistry,
  FlowNodeBaseType,
  FlowTransitionLabelEnum,
  FlowTransitionLineEnum,
  getDefaultSpacing,
  Vertex,
} from '@flowgram.ai/document';
import { FlowNodeTransformData } from '@flowgram.ai/document';

import { getPortChildInput, getSlotChildLineStartPoint } from '../utils/transition';
import { SlotNodeType } from '../typings';
import {
  RENDER_SLOT_ADDER_KEY,
  SlotSpacingKey,
  SLOT_PORT_DISTANCE,
  SLOT_RADIUS,
  SLOT_LABEL_DISTANCE,
  RENDER_SLOT_LABEL_KEY,
  SLOT_BLOCK_VERTICAL_SPACING,
} from '../constants';

export const SlotBlockRegistry: FlowNodeRegistry = {
  type: SlotNodeType.SlotBlock,
  extend: FlowNodeBaseType.BLOCK,
  meta: {
    inlineSpacingAfter: 0,
    inlineSpacingPre: 0,
    spacing: (transform) => {
      // 水平布局没有子节点情况
      if (!transform.entity.isVertical && transform.size.width === 0) {
        return 90;
      }
      return getDefaultSpacing(
        transform.entity,
        SlotSpacingKey.SLOT_BLOCK_VERTICAL_SPACING,
        SLOT_BLOCK_VERTICAL_SPACING
      );
    },
    isInlineBlocks: (node) => !node.isVertical,
  },
  getLines(transition) {
    const icon = transition.transform.parent?.pre;
    const start = getSlotChildLineStartPoint(icon);
    const portPoint = transition.transform.inputPoint;

    const radius = getDefaultSpacing(
      transition.transform.entity,
      SlotSpacingKey.SLOT_RADIUS,
      SLOT_RADIUS
    );

    let startPortVertices: Vertex[] = [{ x: start.x, y: portPoint.y }];

    /**
     * When Radius is not enough, we should use truncate strategy
     * 弧度不够时，采取截断策略
     */
    if (transition.entity.isVertical) {
      const deltaY = Math.abs(portPoint.y - start.y);
      let deltaX = radius;
      let isTruncated = false;

      if (deltaY < radius * 2) {
        isTruncated = true;
        if (deltaY < radius) {
          // Calculate the x by circle equation
          deltaX = Math.sqrt(radius ** 2 - (radius - deltaY) ** 2);
        }
      }

      startPortVertices = [
        {
          x: start.x + deltaX,
          y: start.y,
          radiusX: radius,
          radiusY: radius,
          radiusOverflow: 'truncate',
        },
        {
          x: start.x + deltaX,
          y: portPoint.y,
          ...(isTruncated ? { radiusX: 0, radiusY: 0 } : {}),
        },
      ];
    }

    /**
     * When One Children, we should keep dash array align, so we draw one line directly to child nodes
     * 只有一个子节点时，我们通常需要保证两条虚线是连贯的，因此我们直接合并，绘制一条线连到子节点
     */
    if (transition.transform.children.length === 1) {
      return [
        {
          type: FlowTransitionLineEnum.ROUNDED_LINE,
          from: start,
          to: getPortChildInput(transition.transform.children[0]),
          vertices: startPortVertices,
          style: {
            strokeDasharray: '5 5',
          },
          radius,
        },
      ];
    }

    return [
      {
        type: FlowTransitionLineEnum.ROUNDED_LINE,
        from: start,
        to: portPoint,
        vertices: startPortVertices,
        style: {
          strokeDasharray: '5 5',
        },
        radius,
      },
      ...transition.transform.children.map((_child) => {
        const childInput = getPortChildInput(_child);

        return {
          type: FlowTransitionLineEnum.ROUNDED_LINE,
          radius,
          from: portPoint,
          to: childInput,
          vertices: [{ x: portPoint.x, y: childInput.y }],
          style: {
            strokeDasharray: '5 5',
          },
        };
      }),
    ];
  },
  getLabels(transition) {
    const icon = transition.transform.parent?.pre;
    const start = getSlotChildLineStartPoint(icon);
    const portPoint = transition.transform.inputPoint;

    return [
      {
        type: FlowTransitionLabelEnum.CUSTOM_LABEL,
        renderKey: RENDER_SLOT_ADDER_KEY,
        props: {
          node: transition.entity,
        },
        offset: portPoint,
      },
      {
        type: FlowTransitionLabelEnum.CUSTOM_LABEL,
        renderKey: RENDER_SLOT_LABEL_KEY,
        props: {
          node: transition.entity,
        },
        offset: {
          x:
            start.x +
            getDefaultSpacing(
              transition.entity,
              SlotSpacingKey.SLOT_LABEL_DISTANCE,
              SLOT_LABEL_DISTANCE
            ),
          y: portPoint.y,
        },
        origin: [0, 0.5],
      },
    ];
  },
  getInputPoint(transform) {
    const icon = transform.parent?.pre;
    const start = getSlotChildLineStartPoint(icon);

    let inputY = transform.bounds.center.y;
    if (transform.children.length) {
      inputY = mean([
        getPortChildInput(transform.firstChild).y,
        getPortChildInput(transform.lastChild).y,
      ]);
    }

    return {
      x:
        start.x +
        getDefaultSpacing(transform.entity, SlotSpacingKey.SLOT_PORT_DISTANCE, SLOT_PORT_DISTANCE),
      y: inputY,
    };
  },
  getChildDelta(child, layout) {
    const hasChild = !!child.firstChild;

    if (child.entity.isVertical) {
      // 绑定普通节点时进行重心纠偏
      let deltaX = hasChild ? 0 : -child.originDeltaX;

      return { x: deltaX, y: 0 };
    }

    let deltaY = hasChild ? 0 : -child.originDeltaY;

    const preTransform = child.entity.pre?.getData(FlowNodeTransformData);
    if (preTransform) {
      const { localBounds: preBounds } = preTransform;

      return {
        x: 0,
        y: preBounds.bottom + 30 + deltaY,
      };
    }

    return { x: 0, y: deltaY };
  },
  getChildLabels() {
    return [];
  },
  getChildLines() {
    return [];
  },
  getDelta(transform) {
    return {
      x: 0,
      y: 0,
    };
  },
};
