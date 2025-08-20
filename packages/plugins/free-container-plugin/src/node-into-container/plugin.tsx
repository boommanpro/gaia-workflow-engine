/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import type { WorkflowContainerPluginOptions } from './type';
import { NodeIntoContainerService } from '.';

export const createContainerNodePlugin = definePluginCreator<WorkflowContainerPluginOptions>({
  onBind: ({ bind }) => {
    bind(NodeIntoContainerService).toSelf().inSingletonScope();
  },
  onInit(ctx, options) {
    ctx.get(NodeIntoContainerService).init();
  },
  onReady(ctx, options) {
    if (options.disableNodeIntoContainer !== true) {
      ctx.get(NodeIntoContainerService).ready();
    }
  },
  onDispose(ctx) {
    ctx.get(NodeIntoContainerService).dispose();
  },
});
