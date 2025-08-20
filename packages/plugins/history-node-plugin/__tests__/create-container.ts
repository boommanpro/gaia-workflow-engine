/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormModel } from '@flowgram.ai/form';
import { FlowDocumentContainerModule } from '@flowgram.ai/document';
import { loadPlugins, Playground, PlaygroundMockTools } from '@flowgram.ai/core';
import { createHistoryPlugin, HistoryService } from '@flowgram.ai/history';

import { attachFormValuesChange } from '../src/utils';
import { createHistoryNodePlugin } from '../src';

export const createContainer = () => {
  const container = PlaygroundMockTools.createContainer([FlowDocumentContainerModule]);

  const formModel = new FormModel();

  const playground = container.get(Playground);

  loadPlugins([createHistoryPlugin({ enable: true }), createHistoryNodePlugin({})], container);
  playground.init();

  const historyService = container.get(HistoryService);
  historyService.context.source = container;

  attachFormValuesChange(formModel as any, { id: 1 } as any, historyService);

  return {
    formModel,
    container,
    historyService,
  };
};
