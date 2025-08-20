/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { createNodeClientPlugins } from './node-client/create-node-client-plugins';
import { FlowEditorClient } from './flow-editor-client';

export const createFlowEditorClientPlugin = definePluginCreator<{}>({
  onBind({ bind }) {
    bind(FlowEditorClient).toSelf().inSingletonScope();
  },
});

export const createFlowEditorClientPlugins = () => [
  ...createNodeClientPlugins(),
  createFlowEditorClientPlugin({}),
];
