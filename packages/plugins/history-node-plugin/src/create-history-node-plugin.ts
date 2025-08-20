/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocument } from '@flowgram.ai/document';
import { bindContributions, definePluginCreator } from '@flowgram.ai/core';
import { HistoryContainerModule, HistoryService, OperationContribution } from '@flowgram.ai/history';

import { attachFormValuesChange, getFormModelV2 } from './utils';
import { HistoryNodeRegisters } from './history-node-registers';

/**
 * 表单历史插件
 */
export const createHistoryNodePlugin = definePluginCreator({
  onBind: ({ bind }) => {
    bindContributions(bind, HistoryNodeRegisters, [OperationContribution]);
  },
  onInit: (ctx, _opts) => {
    const document = ctx.get<FlowDocument>(FlowDocument);
    const historyService = ctx.get<HistoryService>(HistoryService);

    document.onNodeCreate(({ node }) => {
      const formModel = getFormModelV2(node);

      if (!formModel) {
        return;
      }

      attachFormValuesChange(formModel, node, historyService);
    });
  },
  containerModules: [HistoryContainerModule],
});
