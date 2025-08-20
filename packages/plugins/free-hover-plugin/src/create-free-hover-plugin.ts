/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { HoverLayer } from './hover-layer';

export const createFreeHoverPlugin = definePluginCreator({
  onInit(ctx): void {
    ctx.playground.registerLayer(HoverLayer);
  },
});
