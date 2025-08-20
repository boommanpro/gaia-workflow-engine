/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type OperationMeta } from '@flowgram.ai/history';
import { FlowDocument } from '@flowgram.ai/document';
import { type PluginContext } from '@flowgram.ai/core';

import { getFormModelV2, shouldChangeFormValuesMerge } from '../utils';
import { ChangeFormValuesOperationValue, NodeOperationType } from '../types';

/**
 * 表单修改操作
 */
export const changeFormValueOperationMeta: OperationMeta<
  ChangeFormValuesOperationValue,
  PluginContext,
  void
> = {
  type: NodeOperationType.changeFormValues,
  inverse: (op) => ({
    ...op,
    value: {
      ...op.value,
      value: op.value.oldValue,
      oldValue: op.value.value,
    },
  }),
  apply: ({ value: { value, path, id } }, ctx: PluginContext) => {
    const document = ctx.get<FlowDocument>(FlowDocument);
    const formModel = getFormModelV2(document.getNode(id));

    if (!formModel) {
      return;
    }
    if (!path) {
      formModel.updateFormValues(value);
    } else {
      formModel.setValueIn(path, value);
    }
  },
  shouldMerge: shouldChangeFormValuesMerge as OperationMeta['shouldMerge'],
};
