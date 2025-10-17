/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { cloneDeep } from 'lodash-es';
import { type OperationMeta } from '@flowgram.ai/history';
import { WorkflowDocument, type WorkflowNodeJSON } from '@flowgram.ai/free-layout-core';
import { type PluginContext } from '@flowgram.ai/core';

import { type AddOrDeleteWorkflowNodeOperationValue, FreeOperationType } from '../types';
import { FreeHistoryConfig } from '../free-history-config';
import { baseOperationMeta } from './base';

export const addNodeOperationMeta: OperationMeta<
  AddOrDeleteWorkflowNodeOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: FreeOperationType.addNode,
  inverse: (op) => ({
    ...op,
    type: FreeOperationType.deleteNode,
  }),
  apply: async (operation, ctx: PluginContext) => {
    const document = ctx.get<WorkflowDocument>(WorkflowDocument);
    await document.createWorkflowNode(
      cloneDeep(operation.value.node) as WorkflowNodeJSON,
      false,
      operation.value.parentID
    );
  },
  getLabel: (op, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    return `Create Node ${config.getNodeLabel(op.value.node)}`;
  },
  getDescription: (op, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    let desc = `Create Node ${config.getNodeLabel(op.value.node)}`;
    if (op.value.node.meta?.position) {
      desc += ` at ${op.value.node.meta.position.x},${op.value.node.meta.position.y}`;
    }
    return desc;
  },
};
