/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/editor';

import { WorkflowOperationService } from '../types';
import { HistoryOperationServiceImpl } from '../services/history-operation-service';
import { WorkflowOperationServiceImpl } from '../services/flow-operation-service';
import { FreeLayoutProps } from '../preset';

export const createOperationPlugin = definePluginCreator<FreeLayoutProps>({
  onBind: ({ bind }, opts) => {
    bind(WorkflowOperationService)
      .to(opts?.history?.enable ? HistoryOperationServiceImpl : WorkflowOperationServiceImpl)
      .inSingletonScope();
  },
  onDispose: (ctx) => {
    const flowOperationService =
      ctx.container.get<WorkflowOperationService>(WorkflowOperationService);
    flowOperationService.dispose();
  },
});
