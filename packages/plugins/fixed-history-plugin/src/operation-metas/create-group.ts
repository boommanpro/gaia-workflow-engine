/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { createOrUngroupValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { baseOperationMeta } from './base';

export const createGroupOperationMeta: OperationMeta<createOrUngroupValue, PluginContext, void> = {
  ...baseOperationMeta,
  type: OperationType.createGroup,
  inverse: op => ({ ...op, type: OperationType.ungroup }),
  getLabel: (op, ctx) => {
    const value = op.value;
    return `Create group ${value.groupId} from ${value.targetId}`;
  },
  getDescription: (op, ctx) => {
    const value = op.value;
    return `Create group with nodes ${value.nodeIds.join(', ')}`;
  },
};
