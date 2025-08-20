/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MoveChildNodesOperationValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const moveChildNodesOperationMeta: OperationMeta<
  MoveChildNodesOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: OperationType.moveChildNodes,
  inverse: op => ({
    ...op,
    value: {
      ...op.value,
      fromIndex: op.value.toIndex,
      toIndex: op.value.fromIndex,
      fromParentId: op.value.toParentId,
      toParentId: op.value.fromParentId,
    },
  }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `Move ${value.nodeIds.map(id => config.getNodeLabelById(id)).join(',')}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    const position = typeof value.toIndex !== 'undefined' ? `position ${value.toIndex}` : 'the end';
    return `Move nodes ${value.nodeIds
      .map(id => config.getNodeLabelById(id))
      .join(',')} to ${position}`;
  },
};
