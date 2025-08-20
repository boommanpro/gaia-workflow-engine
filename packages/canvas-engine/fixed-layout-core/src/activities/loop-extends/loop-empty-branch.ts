/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowNodeRegistry, FlowTransitionLabelEnum } from '@flowgram.ai/document';

import { LoopSpacings, LoopTypeEnum } from './constants';

export const LoopEmptyBranchRegistry: FlowNodeRegistry = {
  type: LoopTypeEnum.LOOP_EMPTY_BRANCH,
  meta: {
    inlineSpacingAfter: 0,
    spacing: LoopSpacings.EMPTY_BRANCH_SPACING,
    size: {
      width: 100,
      height: 0,
    },
  },
  getLabels(transition) {
    const { isVertical } = transition.entity;
    const currentTransform = transition.transform;
    if (isVertical) {
      return [
        {
          type: FlowTransitionLabelEnum.ADDER_LABEL,
          offset: {
            x: currentTransform.inputPoint.x,
            y: currentTransform.bounds.center.y + 8, // 右边空节点
          },
        },
      ];
    }
    return [
      {
        type: FlowTransitionLabelEnum.ADDER_LABEL,
        offset: {
          x: currentTransform.bounds.center.x + 8,
          y: currentTransform.inputPoint.y,
        },
      },
    ];
  },
  onAfterUpdateLocalTransform(transform): void {
    if (transform.entity.isVertical) {
      transform.data.size = {
        width: 100,
        height: 0,
      };
    } else {
      transform.data.size = {
        width: 0,
        height: 100,
      };
    }
    transform.transform.update({
      size: transform.data.size,
    });
  },
};
