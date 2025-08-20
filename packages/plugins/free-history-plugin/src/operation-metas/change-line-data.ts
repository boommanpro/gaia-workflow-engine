/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type OperationMeta } from '@flowgram.ai/history';
import { WorkflowLinesManager } from '@flowgram.ai/free-layout-core';
import { type PluginContext } from '@flowgram.ai/core';

import { FreeOperationType, type ChangeLineDataValue } from '../types';
import { baseOperationMeta } from './base';

export const changeLineDataOperationMeta: OperationMeta<ChangeLineDataValue, PluginContext, void> =
  {
    ...baseOperationMeta,
    type: FreeOperationType.changeLineData,
    inverse: (op) => ({
      ...op,
      value: {
        ...op.value,
        newValue: op.value.oldValue,
        oldValue: op.value.newValue,
      },
    }),
    apply: (op, ctx: PluginContext) => {
      const linesManager = ctx.get<WorkflowLinesManager>(WorkflowLinesManager);
      const line = linesManager.getLineById(op.value.id);

      if (!line) {
        return;
      }

      line.lineData = op.value.newValue;
    },
    shouldMerge: (op, prev, element) => {
      if (!prev) {
        return false;
      }

      if (Date.now() - element.getTimestamp() < 500) {
        if (
          op.type === prev.type && // 相同类型
          op.value.id === prev.value.id // 相同节点
        ) {
          return {
            type: op.type,
            value: {
              ...op.value,
              newValue: op.value.newValue,
              oldValue: prev.value.oldValue,
            },
          };
        }
        return true;
      }
      return false;
    },
  };
