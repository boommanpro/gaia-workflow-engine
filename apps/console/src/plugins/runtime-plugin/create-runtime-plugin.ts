/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { definePluginCreator, PluginContext } from '@flowgram.ai/free-layout-editor';

import { RuntimePluginOptions } from './type';
import { WorkflowRuntimeService } from './runtime-service';
import {
  WorkflowRuntimeBrowserClient,
  WorkflowRuntimeClient,
  WorkflowRuntimeServerClient,
} from './client';

export const createRuntimePlugin = definePluginCreator<RuntimePluginOptions, PluginContext>({
  onBind({ bind, rebind }, options) {
    bind(WorkflowRuntimeClient).toSelf().inSingletonScope();
    bind(WorkflowRuntimeServerClient).toSelf().inSingletonScope();
    bind(WorkflowRuntimeBrowserClient).toSelf().inSingletonScope();
    if (options.mode === 'server') {
      rebind(WorkflowRuntimeClient).to(WorkflowRuntimeServerClient);
    } else {
      rebind(WorkflowRuntimeClient).to(WorkflowRuntimeBrowserClient);
    }
    bind(WorkflowRuntimeService).toSelf().inSingletonScope();
  },
  onInit(ctx, options) {
    if (options.mode === 'server') {
      const serverClient = ctx.get<WorkflowRuntimeServerClient>(WorkflowRuntimeClient);
      serverClient.init(options.serverConfig);
    }
  },
  // 审计 A44：replayStore 是模块级单例，编辑器重挂（载入版本/AI 结构变更）后
  // 旧服务的回放横幅会浮在新画布上；随插件销毁一并清空（经 service.dispose，
  // 不直接 import history-replay——那会制造类型解析环，连累 onInit 的 ctx.get）
  onDispose(ctx) {
    try {
      ctx.get(WorkflowRuntimeService).dispose();
    } catch {
      // 容器拆除窗口期取不到服务：画布身份清理由 editor.tsx 的
      // [workflowCode, remountKey] effect 兜底（A44 双保险）
    }
  },
});
