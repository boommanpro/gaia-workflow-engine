/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// import { FormManager } from '@flowgram.ai/form-core';
import { NodeManager } from '@flowgram.ai/form-core';
import { definePluginCreator } from '@flowgram.ai/core';

import { withNodeVariables } from './with-node-variables';

// import { withNodeVariables } from './with-node-variables';

export const createNodeVariablePlugin = definePluginCreator({
  onInit(ctx) {
    const nodeManager = ctx.get<NodeManager>(NodeManager);
    nodeManager.registerNodeRenderHoc(withNodeVariables);
  },
});
