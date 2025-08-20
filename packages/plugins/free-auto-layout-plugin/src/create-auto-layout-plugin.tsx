/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator } from '@flowgram.ai/core';

import { AutoLayoutOptions } from './type';
import { AutoLayoutService } from './services';

export const createFreeAutoLayoutPlugin = definePluginCreator<AutoLayoutOptions>({
  onBind: ({ bind }) => {
    bind(AutoLayoutService).toSelf().inSingletonScope();
  },
  onInit: (ctx, opts) => {
    ctx.get(AutoLayoutService).init(opts);
  },
  singleton: true,
});
