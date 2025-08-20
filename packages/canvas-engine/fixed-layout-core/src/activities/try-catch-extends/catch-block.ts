/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  DEFAULT_SPACING,
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowTransitionLineEnum,
} from '@flowgram.ai/document';

import { TryCatchSpacings, TryCatchTypeEnum } from './constants';

/**
 * catch 分支
 */
export const CatchBlockRegistry: FlowNodeRegistry = {
  extend: FlowNodeBaseType.BLOCK,
  type: TryCatchTypeEnum.CATCH_BLOCK,
  meta: {
    hidden: true,
    spacing: DEFAULT_SPACING.NULL,
  },
  getLines(transition) {
    const { transform } = transition;
    const { isVertical } = transition.entity;
    const parentPoint = transform.parent!;
    const { inputPoint, outputPoint } = transform;
    let parentInputPoint;
    if (isVertical) {
      parentInputPoint = {
        x: parentPoint.inputPoint.x,
        y: parentPoint.inputPoint.y - TryCatchSpacings.CATCH_INLINE_SPACING,
      };
    } else {
      parentInputPoint = {
        x: parentPoint.inputPoint.x - TryCatchSpacings.CATCH_INLINE_SPACING,
        y: parentPoint.inputPoint.y,
      };
    }

    const lines = [
      {
        type: FlowTransitionLineEnum.DIVERGE_LINE,
        from: parentInputPoint,
        to: inputPoint,
      },
    ];

    // 最后一个节点是 end 节点，不绘制 mergeLine
    if (!transition.isNodeEnd) {
      let mergePoint;
      if (isVertical) {
        mergePoint = {
          x: parentPoint.outputPoint.x,
          y: parentPoint.bounds.bottom,
        };
      } else {
        mergePoint = {
          x: parentPoint.bounds.right,
          y: parentPoint.outputPoint.y,
        };
      }

      lines.push({
        type: FlowTransitionLineEnum.MERGE_LINE,
        from: outputPoint,
        to: mergePoint,
      });
    }

    return lines;
  },
  getLabels() {
    return [];
  },
};
