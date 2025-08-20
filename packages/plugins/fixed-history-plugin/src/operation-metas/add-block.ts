/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { AddOrDeleteBlockValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const addBlockOperationMeta: OperationMeta<AddOrDeleteBlockValue, PluginContext, void> = {
  ...baseOperationMeta,
  type: OperationType.addBlock,
  inverse: op => ({ ...op, type: OperationType.deleteBlock }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `Create ${config.getBlockLabel(value.blockData)}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    const branchName = config.getBlockLabel(value.blockData);
    const targetName = config.getNodeLabelById(value.targetId);
    const position = typeof value.index !== 'undefined' ? `position ${value.index}` : 'the end';
    return `Create branch ${branchName} in ${targetName} at ${position}`;
  },
};
