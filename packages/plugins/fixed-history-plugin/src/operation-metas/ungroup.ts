/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { createOrUngroupValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { baseOperationMeta } from './base';

export const ungroupOperationMeta: OperationMeta<createOrUngroupValue, PluginContext, void> = {
  ...baseOperationMeta,
  type: OperationType.ungroup,
  inverse: op => ({ ...op, type: OperationType.createGroup }),
  getLabel: (op, ctx) => {
    const value = op.value;
    return `Ungroup ${value.groupId}`;
  },
  getDescription: (op, ctx) => {
    const value = op.value;
    return `Ungroup with nodes ${value.nodeIds.join(', ')}`;
  },
};
