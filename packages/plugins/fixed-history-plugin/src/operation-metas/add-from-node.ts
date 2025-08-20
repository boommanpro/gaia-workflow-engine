/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  type AddOrDeleteFromNodeOperationValue,
  type FlowNodeEntity,
  OperationType,
} from '@flowgram.ai/document';
import { type PluginContext } from '@flowgram.ai/core';
import { type OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const addFromNodeOperationMeta: OperationMeta<
  AddOrDeleteFromNodeOperationValue,
  PluginContext,
  FlowNodeEntity
> = {
  ...baseOperationMeta,
  type: OperationType.addFromNode,
  inverse: op => ({ ...op, type: OperationType.deleteFromNode }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const { value } = op;
    return `Create ${config.getNodeLabel(value.data)}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const { value } = op;
    const nodeName = config.getNodeLabel(value.data);
    const fromName = config.getNodeLabelById(value.fromId);
    return `Create ${value.data.type} node ${nodeName} after ${fromName}`;
  },
};
