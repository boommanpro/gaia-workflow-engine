/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeBaseType, type FlowNodeRegistry } from '@flowgram.ai/document';

/**
 * Break 节点, 用于分支断开
 */
export const BreakRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.BREAK,
  extend: FlowNodeBaseType.END,
};
