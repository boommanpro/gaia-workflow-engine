/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type PluginContext } from '@flowgram.ai/core';
import { WorkflowResetLayoutService } from '@flowgram.ai/free-layout-core';
import { type OperationMeta } from '@flowgram.ai/history';

import { FreeOperationType, type ResetLayoutOperationValue } from '../types';
import { baseOperationMeta } from './base';

export const resetLayoutOperationMeta: OperationMeta<
  ResetLayoutOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: FreeOperationType.resetLayout,
  inverse: op => ({
    ...op,
    value: {
      ...op.value,
      value: op.value.oldValue,
      oldValue: op.value.value,
    },
  }),
  apply: async (operation, ctx: PluginContext) => {
    const reset = ctx.get<WorkflowResetLayoutService>(WorkflowResetLayoutService);
    await reset.layoutToPositions(operation.value.ids, operation.value.value);
  },
  shouldMerge: () => false,
};
