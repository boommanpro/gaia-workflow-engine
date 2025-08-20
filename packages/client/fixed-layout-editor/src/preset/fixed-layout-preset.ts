/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { createSelectBoxPlugin } from '@flowgram.ai/select-box-plugin';
import { FixedLayoutContainerModule } from '@flowgram.ai/fixed-layout-core';
import { FixedHistoryService, createFixedHistoryPlugin } from '@flowgram.ai/fixed-history-plugin';
import { createFixedDragPlugin } from '@flowgram.ai/fixed-drag-plugin';
import {
  PluginsProvider,
  createDefaultPreset,
  createVariablePlugin,
  createPlaygroundPlugin,
  createShortcutsPlugin,
  SelectionService,
  Command,
  Plugin,
  FlowDocument,
  FlowNodeEntity,
  FlowDocumentOptionsDefault,
  FlowDocumentOptions,
  FlowNodesContentLayer,
  FlowNodesTransformLayer,
  FlowScrollBarLayer,
  FlowScrollLimitLayer,
  createPlaygroundReactPreset,
} from '@flowgram.ai/editor';

import { compose } from '../utils/compose';
import { FlowOperationService } from '../types';
import { createOperationPlugin } from '../plugins/create-operation-plugin';
import { fromNodeJSON, toNodeJSON } from './node-serialize';
import { FixedLayoutPluginContext, FixedLayoutProps } from './fixed-layout-props';

export function createFixedLayoutPreset(
  opts: FixedLayoutProps
): PluginsProvider<FixedLayoutPluginContext> {
  return (ctx: FixedLayoutPluginContext) => {
    opts = { ...FixedLayoutProps.DEFAULT, ...opts };
    let plugins: Plugin[] = [createOperationPlugin(opts)];
    /**
     * 注册默认的快捷键
     */
    plugins.push(
      createShortcutsPlugin({
        registerShortcuts(registry) {
          const selection = ctx.get<SelectionService>(SelectionService);
          registry.addHandlers({
            commandId: Command.Default.DELETE,
            shortcuts: ['backspace', 'delete'],
            isEnabled: () =>
              selection.selection.length > 0 && !ctx.playground.config.readonlyOrDisabled,
            execute: () => {
              // TODO 这里要判断 CurrentEditor
              const nodes = selection.selection.filter(
                (entity) => entity instanceof FlowNodeEntity
              ) as FlowNodeEntity[];

              const flowOperationService = ctx.get<FlowOperationService>(FlowOperationService);
              flowOperationService.deleteNodes(nodes);
              selection.selection = selection.selection.filter((s) => !s.disposed);
            },
          });

          if (opts?.history?.enable) {
            const fixedHistoryService = ctx.get<FixedHistoryService>(FixedHistoryService);

            if (!opts.history.disableShortcuts) {
              registry.addHandlers({
                commandId: Command.Default.UNDO,
                shortcuts: ['meta z', 'ctrl z'],
                isEnabled: () => true,
                execute: () => {
                  fixedHistoryService.undo();
                },
              });
              registry.addHandlers({
                commandId: Command.Default.REDO,
                shortcuts: ['meta shift z', 'ctrl shift z'],
                isEnabled: () => true,
                execute: () => {
                  fixedHistoryService.redo();
                },
              });
            }
          }
        },
      }),
      /**
       * 圈选逻辑实现
       */
      createSelectBoxPlugin({
        canSelect: (e) =>
          // 需满足以下条件：
          // - 鼠标左键
          e.button === 0 &&
          !(ctx.get(FlowDocument) as FlowDocument).renderState.config.nodeHoveredId,
        ...(opts.selectBox || {}),
      }),
      /**
       * 固定布局拖拽逻辑实现
       */
      createFixedDragPlugin(opts.dragdrop || {})
    );
    /**
     * 加载默认编辑器配置
     */
    plugins = createDefaultPreset(opts, plugins)(ctx);
    /**
     * 注册 变量系统
     */
    if (opts.variableEngine?.enable) {
      plugins.push(
        createVariablePlugin({
          ...opts.variableEngine,
          layout: 'fixed',
        })
      );
    }
    /**
     * 注册 历史记录
     */
    if (opts.history?.enable) {
      plugins.push(createFixedHistoryPlugin(opts.history));
    }
    /*
     * 加载固定布局画布模块
     * */
    plugins.push(
      createPlaygroundPlugin<FixedLayoutPluginContext>({
        containerModules: [FixedLayoutContainerModule],
        onBind(bindConfig) {
          if (!bindConfig.isBound(FlowDocumentOptions)) {
            bindConfig.bind(FlowDocumentOptions).toConstantValue({
              ...FlowDocumentOptionsDefault,
              defaultLayout: opts.defaultLayout,
              toNodeJSON: (node) => toNodeJSON(opts, node),
              fromNodeJSON: (node, json, isFirstCreate) =>
                fromNodeJSON(opts, node, json, isFirstCreate),
              allNodesDefaultExpanded: opts.allNodesDefaultExpanded,
            } as FlowDocumentOptions);
          }
        },
        onInit: (ctx) => {
          ctx.playground.registerLayers(
            FlowNodesContentLayer, // 节点内容渲染
            FlowNodesTransformLayer // 节点位置偏移计算
          );
          // 劫持节点线条
          if (opts.formatNodeLines) {
            ctx.document.options.formatNodeLines = compose([
              ctx.document.options.formatNodeLines,
              opts.formatNodeLines,
            ]);
          }
          // 劫持节点 label
          if (opts.formatNodeLabels) {
            ctx.document.options.formatNodeLabels = compose([
              ctx.document.options.formatNodeLabels,
              opts.formatNodeLabels,
            ]);
          }
          if (opts.scroll?.enableScrollLimit) {
            // 控制滚动范围
            ctx.playground.registerLayer(FlowScrollLimitLayer);
          }
          if (!opts.scroll?.disableScrollBar) {
            // 控制条
            ctx.playground.registerLayer(FlowScrollBarLayer);
          }
          if (opts.scroll?.disableScroll) {
            ctx.playground.config.scrollDisable = true;
          }
          if (opts.nodeRegistries) {
            ctx.document.registerFlowNodes(...opts.nodeRegistries);
          }
        },
      })
    );

    return createPlaygroundReactPreset(opts, plugins)(ctx);
  };
}
