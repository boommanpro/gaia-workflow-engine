/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeBaseType, type FlowNodeRegistry } from '@flowgram.ai/document';

/**
 * 开始节点
 */
export const StartRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.START,
  meta: {
    isStart: true,
    draggable: false,
    selectable: false, // 触发器等开始节点不能被框选
    deleteDisable: true, // 禁止删除
    copyDisable: true, // 禁止copy
    addDisable: true, // 禁止添加
  },
};
