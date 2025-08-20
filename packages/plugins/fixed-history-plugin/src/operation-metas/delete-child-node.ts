/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity, OperationType } from '@flowgram.ai/document';
import { AddOrDeleteChildNodeValue } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';
import { baseOperationMeta } from './base';

export const deleteChildNodeOperationMeta: OperationMeta<
  AddOrDeleteChildNodeValue,
  PluginContext,
  FlowNodeEntity
> = {
  ...baseOperationMeta,
  type: OperationType.deleteChildNode,
  inverse: op => ({ ...op, type: OperationType.addChildNode }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `Delete ${config.getNodeLabel(value.data)}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    const nodeName = config.getNodeLabel(value.data);
    const parentName = config.getParentName(value.parentId);
    const position = typeof value.index !== 'undefined' ? `position ${value.index}` : 'the end';
    return `Delete ${value.data.type} node ${nodeName} in ${parentName} at ${position}`;
  },
};
