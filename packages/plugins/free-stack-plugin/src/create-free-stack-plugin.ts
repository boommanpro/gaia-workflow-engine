/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { FreeStackPluginOptions } from './type';
import { StackingContextManager } from './manager';

export const createFreeStackPlugin = definePluginCreator<FreeStackPluginOptions>({
  singleton: true,
  onBind({ bind }) {
    bind(StackingContextManager).toSelf().inSingletonScope();
  },
  onInit(ctx, options) {
    const stackingContextManager = ctx.get<StackingContextManager>(StackingContextManager);
    stackingContextManager.init(options);
  },
  onReady(ctx) {
    const stackingContextManager = ctx.get<StackingContextManager>(StackingContextManager);
    stackingContextManager.ready();
  },
  onDispose(ctx) {
    const stackingContextManager = ctx.get<StackingContextManager>(StackingContextManager);
    stackingContextManager.dispose();
  },
});
