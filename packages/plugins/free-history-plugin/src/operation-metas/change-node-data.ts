/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeFormData } from '@flowgram.ai/form-core';
import { type PluginContext } from '@flowgram.ai/core';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { type OperationMeta } from '@flowgram.ai/history';

import { FreeOperationType, type ChangeNodeDataValue } from '../types';
import { baseOperationMeta } from './base';

export const changeNodeDataOperationMeta: OperationMeta<ChangeNodeDataValue, PluginContext, void> =
  {
    ...baseOperationMeta,
    type: FreeOperationType.changeNodeData,
    inverse: op => ({
      ...op,
      value: {
        ...op.value,
        value: op.value.oldValue,
        oldValue: op.value.value,
      },
    }),
    apply: (operation, ctx: PluginContext) => {
      const document = ctx.get<WorkflowDocument>(WorkflowDocument);
      const node = document.getNode(operation.value.id);

      if (!node) {
        return;
      }
      const formData = node.getData(FlowNodeFormData);

      if (!formData) {
        return;
      }

      let { path } = operation.value;
      if (path.endsWith('/') && path !== '/') {
        path = path.slice(0, -1);
      }

      if (!path.startsWith('/')) {
        path = `/${path}`;
      }

      const formItem = formData.formModel.getFormItemByPath(path);

      if (!formItem) {
        return;
      }
      formItem.value = operation.value.value;
    },
    shouldMerge: (op, prev, element) => {
      if (!prev) {
        return false;
      }

      if (Date.now() - element.getTimestamp() < 500) {
        if (
          op.type === prev.type && // 相同类型
          op.value.id === prev.value.id && // 相同节点
          op.value?.path === prev.value?.path // 相同路径
        ) {
          return {
            type: op.type,
            value: {
              ...op.value,
              value: op.value.value,
              oldValue: prev.value.oldValue,
            },
          };
        }
        return true;
      }
      return false;
    },
  };
