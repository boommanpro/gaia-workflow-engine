/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowNodeRegistry } from '@flowgram.ai/document';

import { LoopSpacings, LoopTypeEnum } from './constants';

export const LoopLeftEmptyBlockRegistry: FlowNodeRegistry = {
  type: LoopTypeEnum.LOOP_LEFT_EMPTY_BLOCK,
  meta: {
    inlineSpacingAfter: 0,
    spacing: 0,
    size: {
      width: LoopSpacings.LEFT_EMPTY_BLOCK_WIDTH,
      height: 0,
    },
  },
  onAfterUpdateLocalTransform(transform): void {
    // 根据布局要置换宽高数据
    if (transform.entity.isVertical) {
      transform.data.size = {
        width: LoopSpacings.LEFT_EMPTY_BLOCK_WIDTH,
        height: 0,
      };
    } else {
      transform.data.size = {
        width: 0,
        height: LoopSpacings.LEFT_EMPTY_BLOCK_WIDTH,
      };
    }
    transform.transform.update({
      size: transform.data.size,
    });
  },
  getLines() {
    return [];
  },
  getLabels() {
    return [];
  },
};
