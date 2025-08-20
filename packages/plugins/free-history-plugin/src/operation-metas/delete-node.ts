/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type PluginContext } from '@flowgram.ai/core';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { type OperationMeta } from '@flowgram.ai/history';

import { type AddOrDeleteWorkflowNodeOperationValue, FreeOperationType } from '../types';
import { FreeHistoryConfig } from '../free-history-config';
import { baseOperationMeta } from './base';

export const deleteNodeOperationMeta: OperationMeta<
  AddOrDeleteWorkflowNodeOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: FreeOperationType.deleteNode,
  inverse: op => ({
    ...op,
    type: FreeOperationType.addNode,
  }),
  apply: (operation, ctx: PluginContext) => {
    const document = ctx.get<WorkflowDocument>(WorkflowDocument);
    const node = document.getNode(operation.value.node.id);
    if (node) {
      node.dispose();
    }
  },
  getLabel: (op, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    return `Delete Node ${config.getNodeLabel(op.value.node)}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    let desc = `Delete Node ${config.getNodeLabel(op.value.node)}`;
    if (op.value.node.meta?.position) {
      desc += ` at ${op.value.node.meta.position.x},${op.value.node.meta.position.y}`;
    }
    return desc;
  },
};
