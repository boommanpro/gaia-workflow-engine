/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity, FlowOperationBaseService, OperationType } from '@flowgram.ai/document';
import { AddOrDeleteNodeValue } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryConfig } from '../fixed-history-config';

export const addNodeOperationMeta: OperationMeta<
  AddOrDeleteNodeValue,
  PluginContext,
  FlowNodeEntity
> = {
  type: OperationType.addNode,
  inverse: op => ({ ...op, type: OperationType.deleteNode }),
  apply: ({ value: { data, parentId, index, hidden } }, ctx) =>
    ctx.get<FlowOperationBaseService>(FlowOperationBaseService).addNode(data, {
      parent: parentId,
      index,
      hidden,
    }),
  getLabel: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    return `Create ${config.getNodeLabel(value.data)}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FixedHistoryConfig>(FixedHistoryConfig);
    const value = op.value;
    const nodeName = config.getNodeLabel(value.data);
    const parentName = config.getParentName(value.parentId);
    const position = typeof value.index !== 'undefined' ? `position ${value.index}` : 'the end';
    return `Create ${value.data.type} node ${nodeName} in ${parentName} at ${position}`;
  },
};
