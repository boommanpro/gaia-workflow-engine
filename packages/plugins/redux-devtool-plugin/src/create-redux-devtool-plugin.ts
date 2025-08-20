/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { ECSConnector, VariableConnector } from './connectors';

export interface ReduxDevToolPluginOptions {
  enable?: boolean;
  // 需要监听的内容
  ecs?: boolean;
  variable?: boolean;
}

export const createReduxDevToolPlugin = definePluginCreator<ReduxDevToolPluginOptions>({
  onBind({ bind }, opts) {
    const { enable } = opts;
    if (!enable) {
      return;
    }

    bind(ECSConnector).toSelf().inSingletonScope();

    bind(VariableConnector).toSelf().inSingletonScope();
  },
  onInit(ctx, opts) {
    const { enable, ecs = true, variable = false } = opts;
    if (!enable) {
      return;
    }

    if (ecs) {
      ctx.get(ECSConnector);
    }

    if (variable) {
      ctx.get(VariableConnector);
    }
  },
});
