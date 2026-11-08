/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable no-console */
import { useMemo } from 'react';

import { debounce } from 'lodash-es';
import { createPanelManagerPlugin } from '@flowgram.ai/panel-manager-plugin';
import { createMinimapPlugin } from '@flowgram.ai/minimap-plugin';
import { createFreeStackPlugin } from '@flowgram.ai/free-stack-plugin';
import { createFreeSnapPlugin } from '@flowgram.ai/free-snap-plugin';
import { createFreeNodePanelPlugin } from '@flowgram.ai/free-node-panel-plugin';
import { createFreeLinesPlugin } from '@flowgram.ai/free-lines-plugin';
import {
  FlowNodeBaseType,
  FreeLayoutPluginContext,
  FreeLayoutProps,
  WorkflowNodeEntity,
} from '@flowgram.ai/free-layout-editor';
import { createFreeGroupPlugin } from '@flowgram.ai/free-group-plugin';
import { createContainerNodePlugin } from '@flowgram.ai/free-container-plugin';

import { restoreViewportIfSameContent, startViewportTracking } from '../utils/viewport-restore';
import { getApiBaseUrl } from '../utils/apiConfig';
import { canContainNode, onDragLineEnd } from '../utils';
import { FlowDocumentJSON, FlowNodeMeta, FlowNodeRegistry } from '../typings';
import { shortcuts } from '../shortcuts';
import { CustomService } from '../services';
import { WorkflowRuntimeService } from '../plugins/runtime-plugin/runtime-service';
import {
  createContextMenuPlugin,
  createRuntimePlugin,
  createVariablePanelPlugin,
} from '../plugins';
import { defaultFormMeta } from '../nodes/default-form-meta';
import { WorkflowNodeType } from '../nodes';
import { getCurrentLocale } from '../i18n';
import { canvasSync, type CanvasChangeType } from '../document';
import { variableDockPanelFactory } from '../components/variable-dock';
import { testRunPanelFactory } from '../components/testrun/testrun-panel';
import { nodeFormPanelFactory } from '../components/sidebar';
import { SelectorBoxPopover } from '../components/selector-box-popover';
import { singleNodeTestPanelFactory } from '../components/run-node-panel';
import { runHistoryPanelFactory } from '../components/run-history';
import { BaseNode, CommentRender, GroupNodeRender, LineAddButton, NodePanel } from '../components';

/**
 * 画布变更类型的累积缓冲。
 * onContentChange 一次拖拽会连发很多条，600ms 内折叠成一次回流；
 * 但类型要累积 —— 只保留最后一条的话，「删了节点又拖了一下」会被误判成纯拖拽。
 */
const canvasChangeTypes = new Set<CanvasChangeType>();
let lastCanvasContext: FreeLayoutPluginContext | undefined;

const flushCanvasChange = debounce(() => {
  const ctx = lastCanvasContext;
  const types = [...canvasChangeTypes];
  canvasChangeTypes.clear();
  if (!ctx || ctx.document.disposed) return;
  canvasSync.onCanvasChange(types);
}, 600);

/**
 * 首帧视口收敛（收敛 = 恢复用户视口或重新适配全图）。
 *
 * 同一条管线只收敛一次（守卫挂管线实例上，重挂风暴/StrictMode 重放各自重置）：
 *  · 已恢复用户视口（__didRestoreViewport）→ 不再 fitView，尊重用户缩放；
 *  · 没有可恢复的视口（首次进入 / 内容已变 / 未 attach store 的预览画布）→ fitView。
 */
function convergeViewportOnce(ctx: FreeLayoutPluginContext, readonly: boolean): void {
  const flag = ctx as { __didInitialFitView?: boolean };
  if (flag.__didInitialFitView) return;
  flag.__didInitialFitView = true;
  if ((ctx as { __didRestoreViewport?: boolean }).__didRestoreViewport) return;
  // ctx.tools.autoLayout(); // init auto layout
  ctx.tools.fitView(false);
  if (readonly) {
    // 只读=列表卡片里的缩略预览：卡片首帧尺寸往往还没稳定（图片/字体回流），
    // 立即 fit 会算错比例，导致节点跑到可视区外。延迟再适配一次。
    setTimeout(() => {
      try {
        ctx.tools.fitView(false);
      } catch {
        /* 编辑器可能已卸载 */
      }
    }, 180);
  }
}

export function useEditorProps(
  initialData: FlowDocumentJSON,
  nodeRegistries: FlowNodeRegistry[],
  readonly = false
): FreeLayoutProps {
  return useMemo<FreeLayoutProps>(
    () => ({
      /**
       * Whether to enable the background
       */
      background: true,
      /**
       * 画布相关配置
       * Canvas-related configurations
       */
      playground: {
        /**
         * Prevent Mac browser gestures from turning pages
         * 阻止 mac 浏览器手势翻页
         */
        preventGlobalGesture: true,
      },
      /**
       * Whether it is read-only or not, the node cannot be dragged in read-only mode
       */
      readonly,
      /**
       * Line support both-way connection (default true)
       * 线条支持双向连接
       */
      twoWayConnection: true,
      /**
       * Initial data
       * 初始化数据
       */
      initialData,
      /**
       * Node registries
       * 节点注册
       */
      nodeRegistries,
      /**
       * Get the default node registry, which will be merged with the 'nodeRegistries'
       * 提供默认的节点注册，这个会和 nodeRegistries 做合并
       */
      getNodeDefaultRegistry(type) {
        return {
          type,
          meta: {
            defaultExpanded: true,
            // 全部节点可折叠：紧凑密度（偏好）= 全局折叠为「芯片+标题」，
            // 折叠态由 FlowGram 原生渲染，端口保留、可正常连线（2026-11-05 修复）
            expandable: true,
          },
          formMeta: defaultFormMeta,
        };
      },
      /**
       * 节点数据转换, 由 ctx.document.fromJSON 调用
       * Node data transformation, called by ctx.document.fromJSON
       * @param node
       * @param json
       */
      fromNodeJSON(node, json) {
        return json;
      },
      /**
       * 节点数据转换, 由 ctx.document.toJSON 调用
       * Node data transformation, called by ctx.document.toJSON
       * @param node
       * @param json
       */
      toNodeJSON(node, json) {
        // 2026-11-07 节点级紧凑态入 DSL：free-layout 默认只序列化 position，
        // compact 经此透传（node-compact-store 写入 getNodeMeta/metaFromJSON）
        const compact = node.getNodeMeta<FlowNodeMeta>().compact;
        if (compact && json && typeof json === 'object') {
          return { ...json, meta: { ...json.meta, compact: true } };
        }
        return json;
      },
      lineColor: {
        hidden: 'var(--g-workflow-line-color-hidden,transparent)',
        default: 'var(--g-workflow-line-color-default,#4d53e8)',
        drawing: 'var(--g-workflow-line-color-drawing, #5DD6E3)',
        hovered: 'var(--g-workflow-line-color-hover,#37d0ff)',
        selected: 'var(--g-workflow-line-color-selected,#37d0ff)',
        error: 'var(--g-workflow-line-color-error,red)',
        flowing: 'var(--g-workflow-line-color-flowing,#4d53e8)',
      },
      /*
       * Check whether the line can be added
       * 判断是否连线
       */
      canAddLine(ctx, fromPort, toPort) {
        // Cannot be a self-loop on the same node / 不能是同一节点自循环
        if (fromPort.node === toPort.node) {
          return false;
        }
        // Cannot be in different containers - 不能在不同容器
        if (
          fromPort.node.parent?.id !== toPort.node.parent?.id &&
          ![fromPort.node.parent?.flowNodeType, toPort.node.parent?.flowNodeType].includes(
            FlowNodeBaseType.GROUP
          )
        ) {
          return false;
        }
        /**
         * 线条环检测，不允许连接到前面的节点
         * Line loop detection, which is not allowed to connect to the node in front of it
         */
        return !fromPort.node.lines.allInputNodes.includes(toPort.node);
      },
      /**
       * Check whether the line can be deleted, this triggers on the default shortcut `Bakspace` or `Delete`
       * 判断是否能删除连线, 这个会在默认快捷键 (Backspace or Delete) 触发
       */
      canDeleteLine(ctx, line, newLineInfo, silent) {
        return true;
      },
      /**
       * Check whether the node can be deleted, this triggers on the default shortcut `Bakspace` or `Delete`
       * 判断是否能删除节点, 这个会在默认快捷键 (Backspace or Delete) 触发
       */
      canDeleteNode(ctx, node) {
        return true;
      },
      /**
       * 是否允许拖入子画布 (loop or group)
       * Whether to allow dragging into the sub-canvas (loop or group)
       */
      canDropToNode: (ctx, params) => canContainNode(params.dragNodeType!, params.dropNodeType!),
      /**
       * Whether to reset line
       * 是否允许重连
       * @param ctx
       * @param oldLine
       * @param newLineInfo
       */
      canResetLine: (ctx, oldLine, newLineInfo) => true,
      /**
       * Drag the end of the line to create an add panel (feature optional)
       * 拖拽线条结束需要创建一个添加面板 （功能可选）
       * 希望提供控制线条粗细的配置项
       */
      onDragLineEnd,
      /**
       * SelectBox config
       */
      selectBox: {
        SelectorBoxPopover,
      },
      scroll: {
        /**
         * Whether to restrict the node from rolling out of the canvas needs to be closed because there is a running results pane
         * 是否限制节点不能滚出画布，由于有运行结果面板，所以需要关闭
         */
        enableScrollLimit: false,
      },
      materials: {
        components: {},
        /**
         * Render Node
         */
        renderDefaultNode: BaseNode,
        renderNodes: {
          [WorkflowNodeType.Comment]: CommentRender,
        },
      },
      /**
       * Node engine enable, you can configure formMeta in the FlowNodeRegistry
       */
      nodeEngine: {
        enable: true,
      },
      /**
       * Variable engine enable
       */
      variableEngine: {
        enable: true,
      },
      /**
       * Redo/Undo enable
       */
      history: {
        enable: true,
        /**
         * Listen form data change, default true
         */
        enableChangeNode: true,
      },
      /**
       * Content change
       *
       * 画布内容变化回流到 headless DSL store —— 这条线是「单一事实源」成立的前提。
       * 未 attach 的画布（首页预览、模板编辑器）会在这里被 canvasSync 内部直接忽略。
       */
      onContentChange: (ctx: FreeLayoutPluginContext, event) => {
        lastCanvasContext = ctx;
        const type = (event as { type?: CanvasChangeType } | undefined)?.type;
        if (typeof type === 'string') canvasChangeTypes.add(type);
        flushCanvasChange();
      },
      /**
       * Running line
       */
      isFlowingLine: (ctx, line) => ctx.get(WorkflowRuntimeService).isFlowingLine(line),
      /**
       * Shortcuts
       */
      shortcuts,
      /**
       * Bind custom service
       */
      onBind: ({ bind }) => {
        bind(CustomService).toSelf().inSingletonScope();
      },
      /**
       * Playground init（render 期，图层/UI 均未就绪——只做无副作用的订阅）
       */
      onInit(ctx) {
        // 持续追踪用户视口进快照（按内容指纹分桶，见 utils/viewport-restore）。
        // 恢复动作不能在这里做：onZoom 事件此刻到不了渲染层（见 onLoad 注释）。
        startViewportTracking(ctx);
        console.log('--- Playground init ---');
      },
      /**
       * 画布数据加载完成（document.load() 落定，节点 bounds 已就绪，图层与 UI 已订阅）。
       *
       * 首帧视口收敛的主时机：先按内容指纹恢复用户视口（此刻 updateConfig 触发的
       * onZoom 能正常到达渲染层），无可恢复才 fitView。
       * 之前的实现把恢复放在 onInit、fitView 只挂 onAllLayersRendered——前者事件
       * 到不了渲染层，后者二次挂载实测可能 30s 不触发甚至不触发，首页「在线演示」
       * 往返后画布便停在初始 zoom=1，视觉上被放大 3 倍（2026-11-08）。
       */
      onLoad(ctx) {
        (ctx as { __didRestoreViewport?: boolean }).__didRestoreViewport =
          restoreViewportIfSameContent(ctx);
        convergeViewportOnce(ctx, readonly);
      },
      /**
       * Playground render（兜底：onLoad 若因版本差异缺失，这里仍会收敛；
       * 同一守卫防重复。本回调任意图层完成首帧就触发，连发时只认第一次）
       */
      onAllLayersRendered(ctx) {
        convergeViewportOnce(ctx, readonly);
      },
      /**
       * Playground dispose
       */
      onDispose() {
        console.log('---- Playground Dispose ----');
      },
      i18n: {
        // 默认中文（与全局 i18n 模块保持一致）
        locale: getCurrentLocale(),
        languages: {
          'zh-CN': {
            'Never Remind': '不再提示',
            'Hold {{key}} to drag node out': '按住 {{key}} 可以将节点拖出',
          },
          'en-US': {},
        },
      },
      plugins: () => [
        /**
         * Custom node sorting, the code below will make the comment nodes always below the normal nodes
         * 自定义节点排序，下边的代码会让 comment 节点永远在普通节点下边
         */
        createFreeStackPlugin({
          sortNodes: (nodes: WorkflowNodeEntity[]) => {
            const commentNodes: WorkflowNodeEntity[] = [];
            const otherNodes: WorkflowNodeEntity[] = [];
            nodes.forEach((node) => {
              if (node.flowNodeType === WorkflowNodeType.Comment) {
                commentNodes.push(node);
              } else {
                otherNodes.push(node);
              }
            });
            return [...commentNodes, ...otherNodes];
          },
        }),
        /**
         * Line render plugin
         * 连线渲染插件
         */
        createFreeLinesPlugin({
          renderInsideLine: LineAddButton,
        }),
        /**
         * Minimap plugin
         * 缩略图插件
         */
        createMinimapPlugin({
          disableLayer: true,
          canvasStyle: {
            canvasWidth: 182,
            canvasHeight: 102,
            canvasPadding: 50,
            canvasBackground: 'rgba(242, 243, 245, 1)',
            canvasBorderRadius: 10,
            viewportBackground: 'rgba(255, 255, 255, 1)',
            viewportBorderRadius: 4,
            viewportBorderColor: 'rgba(6, 7, 9, 0.10)',
            viewportBorderWidth: 1,
            viewportBorderDashLength: undefined,
            nodeColor: 'rgba(0, 0, 0, 0.10)',
            nodeBorderRadius: 2,
            nodeBorderWidth: 0.145,
            nodeBorderColor: 'rgba(6, 7, 9, 0.10)',
            overlayColor: 'rgba(255, 255, 255, 0.55)',
          },
        }),

        /**
         * Snap plugin
         * 自动对齐及辅助线插件
         */
        createFreeSnapPlugin({
          edgeColor: '#00B2B2',
          alignColor: '#00B2B2',
          edgeLineWidth: 1,
          alignLineWidth: 1,
          alignCrossWidth: 8,
        }),
        /**
         * NodeAddPanel render plugin
         * 节点添加面板渲染插件
         */
        createFreeNodePanelPlugin({
          renderer: NodePanel,
        }),
        /**
         * This is used for the rendering of the loop node sub-canvas
         * 这个用于 loop 节点子画布的渲染
         */
        createContainerNodePlugin({}),
        /**
         * Group plugin
         */
        createFreeGroupPlugin({
          groupNodeRender: GroupNodeRender,
        }),
        /**
         * ContextMenu plugin
         */
        createContextMenuPlugin({}),
        /**
         * Runtime plugin
         * ⚠️ Browser mode is for demo only; for production, please deploy the server-side runtime
         * https://flowgram.ai/guide/runtime/introduction.html
         */
        createRuntimePlugin({
          // mode: 'browser',
          mode: 'server',
          serverConfig: (() => {
            const apiBaseUrl = getApiBaseUrl();
            try {
              // 处理相对URL（如 /api），拼接当前页面 origin
              const fullUrl = apiBaseUrl.startsWith('http')
                ? apiBaseUrl
                : `${window.location.origin}${apiBaseUrl}`;
              const url = new URL(fullUrl);
              return {
                domain: url.hostname,
                port: url.port ? parseInt(url.port) : url.protocol === 'https:' ? 443 : 80,
                protocol: url.protocol.replace(':', ''),
                pathname: url.pathname,
              };
            } catch (error) {
              console.warn(
                'Failed to parse API base URL for runtime plugin, using current origin:',
                error
              );
              return {
                domain: window.location.hostname,
                port: window.location.port
                  ? parseInt(window.location.port)
                  : window.location.protocol === 'https:'
                  ? 443
                  : 80,
                protocol: window.location.protocol.replace(':', ''),
                pathname: '/api',
              };
            }
          })(),
        }),

        /**
         * Variable panel plugin
         * 变量面板插件
         */
        createVariablePanelPlugin({
          initialData: initialData.globalVariable,
        }),
        /** Float layout plugin */
        createPanelManagerPlugin({
          factories: [
            nodeFormPanelFactory,
            testRunPanelFactory,
            runHistoryPanelFactory,
            singleNodeTestPanelFactory,
            // 变量 Dock（bottom 区，2026-11-05 方案 A）：替代旧 world 层浮动变量面板
            variableDockPanelFactory,
          ],
        }),
      ],
    }),
    [initialData]
  );
}
