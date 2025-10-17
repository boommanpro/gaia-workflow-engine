/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { defineConfig } from './services/panel-config';
import { PanelManager, PanelManagerConfig, PanelLayer } from './services';

export const createPanelManagerPlugin = definePluginCreator<Partial<PanelManagerConfig>>({
  onBind: ({ bind }, opt) => {
    bind(PanelManager).to(PanelManager).inSingletonScope();
    bind(PanelManagerConfig).toConstantValue(defineConfig(opt));
  },
  onInit(ctx, opt) {
    ctx.playground.registerLayer(PanelLayer);
    const panelManager = ctx.container.get<PanelManager>(PanelManager);
    panelManager.init();
  },
});
