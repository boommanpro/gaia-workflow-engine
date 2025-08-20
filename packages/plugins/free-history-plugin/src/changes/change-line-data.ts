/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type WorkflowLineEntity } from '@flowgram.ai/free-layout-core';
import { WorkflowContentChangeType } from '@flowgram.ai/free-layout-core';

import {
  type ChangeLineDataOperation,
  type ChangeLineDataValue,
  type ContentChangeTypeToOperation,
  FreeOperationType,
} from '../types';
import { FreeHistoryConfig } from '../free-history-config';

export const changeLineData: ContentChangeTypeToOperation<ChangeLineDataOperation> = {
  type: WorkflowContentChangeType.LINE_DATA_CHANGE,
  toOperation: (event, ctx) => {
    const config = ctx.get<FreeHistoryConfig>(FreeHistoryConfig);
    const line = event.entity as WorkflowLineEntity;
    const value: ChangeLineDataValue = {
      id: line.id,
      oldValue: event.oldValue,
      newValue: line.lineData,
    };
    return {
      type: FreeOperationType.changeLineData,
      value,
      uri: config.getLineURI(line.id),
    };
  },
};
