/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Point } from '@flowgram.ai/utils';
import { FlowTextKey } from '@flowgram.ai/renderer';
import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  type FlowTransitionLabel,
  FlowTransitionLabelEnum,
  type FlowTransitionLine,
  FlowTransitionLineEnum,
  getDefaultSpacing,
  ConstantKeys,
} from '@flowgram.ai/document';

import { LoopSpacings } from './constants';

export const LoopInlineBlocksNodeRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.INLINE_BLOCKS,
  meta: {
    inlineSpacingPre: (node) => {
      const inlineBlocksInlineSpacingTop = getDefaultSpacing(
        node.entity,
        ConstantKeys.INLINE_BLOCKS_INLINE_SPACING_TOP,
        LoopSpacings.INLINE_BLOCKS_INLINE_SPACING_TOP
      );
      return inlineBlocksInlineSpacingTop;
    },
    inlineSpacingAfter: (node) => {
      const inlineBlocksInlineSpacingBottom = getDefaultSpacing(
        node.entity,
        ConstantKeys.INLINE_BLOCKS_INLINE_SPACING_BOTTOM,
        LoopSpacings.INLINE_BLOCKS_INLINE_SPACING_BOTTOM
      );
      return inlineBlocksInlineSpacingBottom;
    },
    minInlineBlockSpacing: (node) =>
      node.entity.isVertical
        ? LoopSpacings.MIN_INLINE_BLOCK_SPACING
        : LoopSpacings.HORIZONTAL_MIN_INLINE_BLOCK_SPACING,
  },
  getLines(transition) {
    const currentTransform = transition.transform;
    const parentTransform = currentTransform.parent!;
    const { isVertical } = transition.entity;

    const lines: FlowTransitionLine[] = [
      // 循环结束线
      {
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: currentTransform.outputPoint,
        to: parentTransform.outputPoint,
      },
    ];

    // 收起时展示
    if (currentTransform.collapsed) {
      return lines;
    }

    const [leftBlockTransform] = currentTransform.children;

    return [
      ...lines,
      // 循环回撤线 - 1 分成两段可以被 viewport 识别出矩阵区域
      {
        type: FlowTransitionLineEnum.ROUNDED_LINE,
        from: currentTransform.outputPoint,
        to: leftBlockTransform.outputPoint,
        vertices: [
          isVertical
            ? { x: leftBlockTransform.inputPoint.x, y: currentTransform.bounds.bottom }
            : { x: currentTransform.bounds.right, y: leftBlockTransform.inputPoint.y },
        ],
      },
      // 循环回撤线 - 2
      {
        type: FlowTransitionLineEnum.ROUNDED_LINE,
        from: leftBlockTransform.outputPoint,
        to: Point.move(
          currentTransform.inputPoint,
          isVertical ? { x: -12, y: 10 } : { x: 10, y: -12 }
        ),
        vertices: [
          isVertical
            ? { x: leftBlockTransform.inputPoint.x, y: currentTransform.bounds.top + 10 }
            : { x: currentTransform.bounds.left + 10, y: leftBlockTransform.inputPoint.y },
        ],
        arrow: true,
      },
    ];
  },
  getLabels(transition) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;

    const labels: FlowTransitionLabel[] = [];

    // 收起时展示
    if (currentTransform.collapsed) {
      return labels;
    }

    const leftBlockTransform = currentTransform.children[0];
    const rightBlockTransform = currentTransform.children[1];

    if (transition.entity.originParent?.id.startsWith('while_')) {
      // 满足条件时
      labels.push({
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.LOOP_WHILE_TEXT,
        rotate: isVertical ? '' : '-90deg',
        offset: isVertical
          ? {
              x: (currentTransform.inputPoint.x + rightBlockTransform.inputPoint.x) / 2,
              y: currentTransform.inputPoint.y + 10,
            }
          : {
              x: currentTransform.inputPoint.x + 10,
              y: (currentTransform.inputPoint.y + rightBlockTransform.inputPoint.y) / 2,
            },
      });
    } else {
      // 循环遍历
      labels.push({
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.LOOP_TRAVERSE_TEXT,
        // rotate: isVertical ? '' : '-90deg',
        offset: isVertical
          ? { x: leftBlockTransform.inputPoint.x, y: currentTransform.bounds.center.y + 5 }
          : { x: currentTransform.bounds.center.x + 5, y: leftBlockTransform.inputPoint.y },
      });
    }

    return labels;
  },
};
