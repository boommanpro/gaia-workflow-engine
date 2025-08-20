/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowDocument, type WorkflowNodeJSON } from '@flowgram.ai/free-layout-core';
import { WorkflowContentChangeType } from '@flowgram.ai/free-layout-core';
import { type FlowNodeEntity } from '@flowgram.ai/document';

import {
  type AddWorkflowNodeOperation,
  type ContentChangeTypeToOperation,
  FreeOperationType,
} from '../types';
import { FreeHistoryConfig } from '../free-history-config';

export const addNodeChange: ContentChangeTypeToOperation<AddWorkflowNodeOperation> = {
  type: WorkflowContentChangeType.ADD_NODE,
  toOperation: (event, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    const document = ctx.get<WorkflowDocument>(WorkflowDocument);
    const node = event.entity as FlowNodeEntity;
    const parentID = node.parent?.id;
    const json: WorkflowNodeJSON = document.toNodeJSON(node);

    return {
      type: FreeOperationType.addNode,
      value: {
        node: json,
        parentID,
      },
      uri: config.getNodeURI(node.id),
    };
  },
};
