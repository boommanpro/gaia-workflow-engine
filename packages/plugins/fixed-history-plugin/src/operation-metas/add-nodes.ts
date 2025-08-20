/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { AddOrDeleteNodesOperationValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const addNodesOperationMeta: OperationMeta<
  AddOrDeleteNodesOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: OperationType.addNodes,
  inverse: op => ({
    ...op,
    type: OperationType.deleteNodes,
  }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `${value.nodes.map(node => `Create ${config.getNodeLabel(node)}`).join(';')}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    const fromName = config.getNodeLabelById(value.fromId);
    return `${value.nodes
      .map(node => `Create ${node.type} node ${config.getNodeLabel(node)} after ${fromName}`)
      .join(';')}`;
  },
};
