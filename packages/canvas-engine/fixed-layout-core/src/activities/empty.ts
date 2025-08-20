/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowTransitionLabelEnum,
  ConstantKeys,
  getDefaultSpacing,
} from '@flowgram.ai/document';

/**
 * 占位节点，宽高为 0, 该节点下边同样有 "添加 label"
 */
export const EmptyRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.EMPTY,
  meta: {
    spacing: (node) => {
      const spacing = getDefaultSpacing(node.entity, ConstantKeys.NODE_SPACING);
      return spacing / 2;
    },
    size: { width: 0, height: 0 },
    hidden: true,
  },
  getLabels(transition) {
    return [
      {
        offset: transition.transform.bounds,
        type: FlowTransitionLabelEnum.ADDER_LABEL,
      },
    ];
  },
};
