/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { createHighlightStyle, removeHighlightStyle } from './highlight-style';

export const createNodeHighlightPlugin = definePluginCreator<{}>({
  onInit() {
    createHighlightStyle();
  },
  onDispose() {
    removeHighlightStyle();
  },
});
