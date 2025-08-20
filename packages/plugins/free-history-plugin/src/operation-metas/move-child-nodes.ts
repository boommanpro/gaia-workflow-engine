/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { OperationMeta } from '@flowgram.ai/history';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { MoveChildNodesOperationValue, OperationType } from '@flowgram.ai/document';
import { FlowNodeBaseType } from '@flowgram.ai/document';
import { PluginContext, TransformData } from '@flowgram.ai/core';

import { baseOperationMeta } from './base';

export const moveChildNodesOperationMeta: OperationMeta<
  MoveChildNodesOperationValue,
  PluginContext,
  void
> = {
  ...baseOperationMeta,
  type: OperationType.moveChildNodes,
  inverse: (op) => ({
    ...op,
    value: {
      ...op.value,
      fromIndex: op.value.toIndex,
      toIndex: op.value.fromIndex,
      fromParentId: op.value.toParentId,
      toParentId: op.value.fromParentId,
    },
  }),
  apply: (operation, ctx: PluginContext) => {
    const document = ctx.get<WorkflowDocument>(WorkflowDocument);
    document.moveChildNodes(operation.value);
    const fromContainer = document.getNode(operation.value.fromParentId);
    requestAnimationFrame(() => {
      if (fromContainer && fromContainer.flowNodeType !== FlowNodeBaseType.ROOT) {
        const fromContainerTransformData = fromContainer.getData(TransformData);
        fromContainerTransformData.fireChange();
      }
    });
  },
};
