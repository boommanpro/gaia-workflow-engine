/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeBaseType, type FlowNodeRegistry } from '@flowgram.ai/document';

/**
 * 输出节点, 一般作为 end 节点
 */
export const OuputRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.OUTPUT,
  extend: FlowNodeBaseType.BLOCK,
  meta: {
    hidden: false,
    isNodeEnd: true,
  },
};
