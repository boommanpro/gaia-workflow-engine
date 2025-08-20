/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ShortcutsRegistry } from '@flowgram.ai/shortcuts-plugin';
import { FlowRendererRegistry } from '@flowgram.ai/renderer';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { FlowGroupService, FlowNodeBaseType } from '@flowgram.ai/document';
import { definePluginCreator, PluginContext } from '@flowgram.ai/core';

import { WorkflowGroupService } from './workflow-group-service';
import { WorkflowGroupPluginOptions } from './type';
import { GroupShortcut, UngroupShortcut } from './shortcuts';
import { GroupNodeRegistry } from './group-node';

export const createFreeGroupPlugin = definePluginCreator<WorkflowGroupPluginOptions, PluginContext>(
  {
    onBind({ bind, rebind }, opts) {
      bind(WorkflowGroupService).toSelf().inSingletonScope();
      bind(WorkflowGroupPluginOptions).toConstantValue(opts);
      rebind(FlowGroupService).toService(WorkflowGroupService);
    },
    onInit(ctx, { groupNodeRender, disableGroupShortcuts = false }) {
      // register node render
      if (groupNodeRender) {
        const renderRegistry = ctx.get<FlowRendererRegistry>(FlowRendererRegistry);
        renderRegistry.registerReactComponent(FlowNodeBaseType.GROUP, groupNodeRender);
      }
      // register shortcuts
      if (!disableGroupShortcuts) {
        const shortcutsRegistry = ctx.get(ShortcutsRegistry);
        shortcutsRegistry.addHandlers(new GroupShortcut(ctx), new UngroupShortcut(ctx));
      }
      const document = ctx.get(WorkflowDocument);
      if (!document.getNodeRegistry(FlowNodeBaseType.GROUP)) {
        document.registerFlowNodes(GroupNodeRegistry);
      }
    },
    onReady(ctx) {
      const groupService = ctx.get(WorkflowGroupService);
      groupService.ready();
    },
    onDispose(ctx) {
      const groupService = ctx.get(WorkflowGroupService);
      groupService.dispose();
    },
  }
);
