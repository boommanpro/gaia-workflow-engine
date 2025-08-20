/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { AddOrDeleteNodesOperationValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const deleteNodesOperationMeta: OperationMeta<
  AddOrDeleteNodesOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: OperationType.deleteNodes,
  inverse: op => ({
    ...op,
    type: OperationType.addNodes,
  }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return value.nodes.map(node => `Delete ${config.getNodeLabel(node)}`).join(';');
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    const fromName = config.getNodeLabelById(value.fromId);
    return value.nodes
      .map(node => `Delete ${node.type} node ${config.getNodeLabel(node)} after ${fromName}`)
      .join(';');
  },
  shouldMerge: (op, prev, stackItem) => {
    if (!prev) {
      return false;
    }
    if (
      // 合并500ms内的操作, 如分组内最后一个节点会联动删除分组
      Date.now() - stackItem.getTimestamp() <
      500
    ) {
      return true;
    }
    return false;
  },
};
