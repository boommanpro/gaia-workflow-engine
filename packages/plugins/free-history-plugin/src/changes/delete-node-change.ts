/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowContentChangeType } from '@flowgram.ai/free-layout-core';
import { type FlowNodeEntity } from '@flowgram.ai/document';

import {
  type ContentChangeTypeToOperation,
  FreeOperationType,
  type DeleteWorkflowNodeOperation,
} from '../types';
import { FreeHistoryConfig } from '../free-history-config';

export const deleteNodeChange: ContentChangeTypeToOperation<DeleteWorkflowNodeOperation> = {
  type: WorkflowContentChangeType.DELETE_NODE,
  toOperation: (event, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    const node = event.entity as FlowNodeEntity;
    const json = event.toJSON();
    const parentID = node.parent?.id;

    return {
      type: FreeOperationType.deleteNode,
      value: {
        node: json,
        parentID,
      },
      uri: config.getNodeURI(node.id),
    };
  },
};
