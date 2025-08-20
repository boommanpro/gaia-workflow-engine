/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ChangeNodeOperationValue, OperationType } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';
import { OperationMeta } from '@flowgram.ai/history';

import { FixedHistoryFormDataService } from '../services';
import { baseOperationMeta } from './base';

export const changeNodeOperationMeta: OperationMeta<ChangeNodeOperationValue, PluginContext, void> =
  {
    ...baseOperationMeta,
    type: OperationType.changeNode,
    inverse: op => ({
      ...op,
      value: { ...op.value, value: op.value.oldValue, oldValue: op.value.value },
    }),
    apply: (operation, ctx) => {
      const fixedFormDataService = ctx.get<FixedHistoryFormDataService>(
        FixedHistoryFormDataService,
      );
      const formData = fixedFormDataService.getFormDataByNodeId(operation.value.id);

      if (!formData) {
        return;
      }

      fixedFormDataService.setFormItemValue(formData, operation.value.path, operation.value.value);
    },
    shouldMerge: (op, prev) => {
      const mergable =
        prev &&
        prev?.value?.path === op.value?.path &&
        prev?.type === OperationType.changeNode &&
        ['string', 'number'].includes(typeof op.value.value);

      if (!mergable) {
        return false;
      }
      return {
        type: OperationType.changeNode,
        value: { ...op.value, oldValue: prev.value.oldValue, value: op.value.value },
      };
    },
    getLabel: op => {
      const value = op.value;
      return `将节点${value.id}的${value.path.split('/').filter(Boolean).join('.')}属性修改为${
        value.value
      }`;
    },
  };
