/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { NodeFocusService } from './node-focus-service';
import { NodeClient } from './node-client';
import { createNodeHighlightPlugin } from './highlight/create-node-highlight-plugin';

export const createNodeClientPlugin = definePluginCreator<{}>({
  onBind({ bind }) {
    bind(NodeFocusService).toSelf().inSingletonScope();
    bind(NodeClient).toSelf().inSingletonScope();
  },
});

export const createNodeClientPlugins = () => [
  createNodeHighlightPlugin({}),
  createNodeClientPlugin({}),
];
