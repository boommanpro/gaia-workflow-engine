/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator, type PluginBindConfig, type PluginContext } from '@flowgram.ai/core';

import { NodePanelPluginOptions } from './type';
import { WorkflowNodePanelService } from './service';
import { WorkflowNodePanelLayer } from './layer';

export const createFreeNodePanelPlugin = definePluginCreator({
  onBind({ bind }: PluginBindConfig) {
    bind(WorkflowNodePanelService).toSelf().inSingletonScope();
  },
  onInit: (ctx: PluginContext, opts: NodePanelPluginOptions) => {
    ctx.playground.registerLayer(WorkflowNodePanelLayer, {
      renderer: opts.renderer,
    });
  },
  onDispose: (ctx: PluginContext) => {
    const nodePanelService = ctx.get(WorkflowNodePanelService);
    nodePanelService.dispose();
  },
});
