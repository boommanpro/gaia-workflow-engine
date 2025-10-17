/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/free-layout-editor';

import { DebugPanelLayer } from './debug-panel-layer';

export const createDebugPanelPlugin = definePluginCreator<{}>({
  onInit(ctx, opts) {
    ctx.playground.registerLayer(DebugPanelLayer);
  },
});
