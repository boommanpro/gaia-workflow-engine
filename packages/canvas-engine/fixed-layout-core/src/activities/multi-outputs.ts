/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  FlowLayoutDefault,
  type FlowNodeRegistry,
  FlowNodeSplitType,
  FlowNodeBaseType,
} from '@flowgram.ai/document';

import { DynamicSplitRegistry } from './dynamic-split';
import { BlockRegistry } from './block';

/**
 * 多输出节点
 * - multiOutputs:
 *  - blockIcon
 *  - inlineBlocks
 *    - output or multiOutputs
 *    - output or multiOutputs
 */
export const MultiOuputsRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.MULTI_OUTPUTS,
  extend: FlowNodeSplitType.SIMPLE_SPLIT,
  meta: {
    isNodeEnd: true,
  },
  getLines: (transition, layout) => {
    // 嵌套在 mutliOutputs 下边
    if (transition.entity.parent?.flowNodeType === FlowNodeBaseType.INLINE_BLOCKS) {
      return BlockRegistry.getLines!(transition, layout);
    }
    return [];
  },
  getLabels: (transition, layout) => [
    ...DynamicSplitRegistry.getLabels!(transition, layout),
    ...BlockRegistry.getLabels!(transition, layout),
  ],
  getOutputPoint(transform, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    const lastChildOutput = transform.lastChild?.outputPoint;

    if (isVertical) {
      return {
        x: lastChildOutput ? lastChildOutput.x : transform.bounds.center.x,
        y: transform.bounds.bottom,
      };
    }

    return {
      x: transform.bounds.right,
      y: lastChildOutput ? lastChildOutput.y : transform.bounds.center.y,
    };
  },
  extendChildRegistries: [
    {
      type: FlowNodeBaseType.BLOCK_ICON,
      meta: {
        // isNodeEnd: true
      },
    },
  ],
};
