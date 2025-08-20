/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator, PluginContext } from '@flowgram.ai/core';

import { CreateMinimapPluginOptions } from './type';
import { FlowMinimapService } from './service';
import { FlowMinimapLayer } from './layer';

export const createMinimapPlugin = definePluginCreator<CreateMinimapPluginOptions>({
  onBind: ({ bind }) => {
    bind(FlowMinimapService).toSelf().inSingletonScope();
  },
  onInit: (ctx: PluginContext, opts: CreateMinimapPluginOptions) => {
    ctx.playground.registerLayer(FlowMinimapLayer, opts);
    ctx.get(FlowMinimapService).init(opts);
  },
  onDispose: (ctx: PluginContext) => {
    ctx.get(FlowMinimapService).dispose();
  },
});
