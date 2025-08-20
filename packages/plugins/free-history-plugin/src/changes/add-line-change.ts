/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type WorkflowLineEntity } from '@flowgram.ai/free-layout-core';
import { WorkflowContentChangeType } from '@flowgram.ai/free-layout-core';

import {
  type AddLineOperation,
  type AddOrDeleteLineOperationValue,
  type ContentChangeTypeToOperation,
  FreeOperationType,
} from '../types';
import { FreeHistoryConfig } from '../free-history-config';

export const addLineChange: ContentChangeTypeToOperation<AddLineOperation> = {
  type: WorkflowContentChangeType.ADD_LINE,
  toOperation: (event, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    const line = event.entity as WorkflowLineEntity;
    const value: AddOrDeleteLineOperationValue = {
      from: line.info.from,
      to: line.info.to || '',
      fromPort: line.info.fromPort || '',
      toPort: line.info.toPort || '',
      data: line.info.data,
      id: line.id,
    };
    return {
      type: FreeOperationType.addLine,
      value,
      uri: config.getLineURI(line.id),
    };
  },
};
