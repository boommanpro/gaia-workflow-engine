/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowNodeRegistry, FlowTransitionLabelEnum } from '@flowgram.ai/document';

import { TryCatchTypeEnum } from './constants';

/**
 * try 占位节点
 */
export const TrySlotRegistry: FlowNodeRegistry = {
  type: TryCatchTypeEnum.TRY_SLOT,
  meta: {
    inlineSpacingAfter: 16,
    spacing: 0,
    size: {
      width: 16,
      height: 0,
    },
  },
  onAfterUpdateLocalTransform(transform): void {
    // 根据布局要置换宽高数据
    if (transform.entity.isVertical) {
      transform.data.size = {
        width: 16,
        height: 0,
      };
    } else {
      transform.data.size = {
        width: 0,
        height: 16,
      };
    }
    transform.transform.update({
      size: transform.data.size,
    });
  },
  getLabels(transition) {
    return [
      {
        offset: transition.transform.bounds.center,
        type: FlowTransitionLabelEnum.ADDER_LABEL,
      },
    ];
  },
};
