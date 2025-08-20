/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator, PluginContext } from '@flowgram.ai/core';

import { CreateGroupPluginOptions } from './type';
import { groupRegisters } from './registers';
import { GroupPluginRegister } from './constant';

/**
 * 分组插件
 */
export const createGroupPlugin = definePluginCreator<CreateGroupPluginOptions>({
  onInit: (ctx: PluginContext, opts: CreateGroupPluginOptions) => {
    const { registers: registerConfs = {} } = opts;
    Object.entries(groupRegisters).forEach(([key, register]) => {
      const registerName = key as GroupPluginRegister;
      const registerConf = registerConfs[registerName];
      if (registerConf === false) {
        return;
      }
      if (typeof registerConf === 'function') {
        registerConf(ctx, opts);
        return;
      }
      register(ctx, opts);
    });
  },
});
