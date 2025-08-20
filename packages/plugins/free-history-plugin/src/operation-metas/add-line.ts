/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type PluginContext } from '@flowgram.ai/core';
import { WorkflowLinesManager } from '@flowgram.ai/free-layout-core';
import { type OperationMeta } from '@flowgram.ai/history';

import { type AddOrDeleteLineOperationValue, FreeOperationType } from '../types';
import { FreeHistoryConfig } from '../free-history-config';
import { baseOperationMeta } from './base';

export const addLineOperationMeta: OperationMeta<
  AddOrDeleteLineOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: FreeOperationType.addLine,
  inverse: op => ({
    ...op,
    type: FreeOperationType.deleteLine,
  }),
  apply: (operation, ctx: PluginContext) => {
    const linesManager = ctx.get<WorkflowLinesManager>(WorkflowLinesManager);
    linesManager.createLine({
      ...operation.value,
      key: operation.value.id,
    });
  },
  getLabel: (op, ctx) => 'Create Line',
  getDescription: (op, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    const { value } = op;
    if (!value.from || !value.to) {
      return 'Create Line';
    }

    const fromName = config.getNodeLabelById(value.from);
    const toName = config.getNodeLabelById(value.to);
    return `Create Line from ${fromName} to ${toName}`;
  },
};
