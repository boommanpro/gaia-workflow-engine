/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MoveNodesOperationValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const moveNodesOperationMeta: OperationMeta<MoveNodesOperationValue, PluginContext, void> = {
  ...baseOperationMeta,
  type: OperationType.moveNodes,
  inverse: op => ({
    ...op,
    value: {
      ...op.value,
      fromId: op.value.toId,
      toId: op.value.fromId,
    },
  }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `${value.nodeIds.map(id => `Move ${config.getNodeLabelById(id)}`).join(';')}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `${value.nodeIds
      .map(id => `Move ${config.getNodeLabelById(id)} to ${config.getNodeLabelById(value.toId)}`)
      .join(';')}`;
  },
  getURI: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const nodeIds = op.value.nodeIds;
    if (nodeIds.length === 0) {
      return;
    }
    return config.getNodeURI(nodeIds[0]);
  },
};
