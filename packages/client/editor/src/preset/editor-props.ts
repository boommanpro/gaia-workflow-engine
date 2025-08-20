/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { VariablePluginOptions } from '@flowgram.ai/variable-plugin';
import { ReduxDevToolPluginOptions } from '@flowgram.ai/redux-devtool-plugin';
import { PlaygroundReactProps, SelectionService } from '@flowgram.ai/playground-react';
import { NodeCorePluginOptions } from '@flowgram.ai/node-core-plugin';
import { MaterialsPluginOptions } from '@flowgram.ai/materials-plugin';
import { I18nPluginOptions } from '@flowgram.ai/i18n-plugin';
import { HistoryPluginOptions } from '@flowgram.ai/history';
import { FormMetaOrFormMetaGenerator } from '@flowgram.ai/form-core';
import {
  FlowDocument,
  FlowDocumentJSON,
  FlowNodeEntity,
  type FlowNodeJSON,
  FlowNodeRegistry,
  FlowNodeType,
} from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';

export interface EditorPluginContext extends PluginContext {
  document: FlowDocument;
  selection: SelectionService;
}

export interface EditorProps<
  CTX extends EditorPluginContext = EditorPluginContext,
  JSON = FlowDocumentJSON
> extends PlaygroundReactProps<CTX> {
  /**
   * Initialize data
   * 初始化数据
   */
  initialData?: JSON;
  /**
   * whether it is readonly
   * 是否为 readonly
   */
  readonly?: boolean;
  /**
   * node registries
   * 节点定义
   */
  nodeRegistries?: FlowNodeRegistry[];
  /**
   * Get the default node registry, which will be merged with the 'nodeRegistries'
   * 提供默认的节点注册，这个会和 nodeRegistries 做合并
   */
  getNodeDefaultRegistry?: (type: FlowNodeType) => FlowNodeRegistry;
  /**
   * Node engine configuration
   */
  nodeEngine?: NodeCorePluginOptions & {
    /**
     * Default formMeta
     */
    createDefaultFormMeta?: (node: FlowNodeEntity) => FormMetaOrFormMetaGenerator;
    /**
     * Enable node engine
     */
    enable?: boolean;
  };
  /**
   * By default, all nodes are expanded
   * 默认是否展开所有节点
   */
  allNodesDefaultExpanded?: boolean;
  /**
   * Canvas material, Used to customize react components
   * 画布物料, 用于自定义 react 组件
   */
  materials?: MaterialsPluginOptions;
  /**
   * 画布数据加载完成, 请使用 onAllLayersRendered 替代
   * @deprecated
   * */
  onLoad?: (ctx: CTX) => void;
  /**
   * 是否开启变量引擎
   * Variable engine enable
   */
  variableEngine?: VariablePluginOptions;
  /**
   * Redo/Undo enable
   */
  history?: HistoryPluginOptions<CTX> & { disableShortcuts?: boolean };

  /**
   * redux devtool configuration
   */
  reduxDevTool?: ReduxDevToolPluginOptions;

  /**
   * Scroll configuration
   * 滚动配置
   */
  scroll?: {
    enableScrollLimit?: boolean; // 开启滚动限制
    disableScrollBar?: boolean; //  关闭滚动条
    disableScroll?: boolean; // 禁止滚动
  };

  /**
   * Node data transformation, called by ctx.document.fromJSON
   * 节点数据转换, 由 ctx.document.fromJSON 调用
   * @param node - current node
   * @param json - Current node json data
   */
  toNodeJSON?(node: FlowNodeEntity, json: FlowNodeJSON): FlowNodeJSON;
  /**
   * Node data transformation, called by ctx.document.toJSON
   * 节点数据转换, 由 ctx.document.toJSON 调用
   * @param node - current node
   * @param json - Current node json data
   * @param isFirstCreate - Whether it is created for the first time, If document.fromJSON is recalled, but the node already exists, isFirstCreate is false
   */
  fromNodeJSON?(node: FlowNodeEntity, json: FlowNodeJSON, isFirstCreate: boolean): FlowNodeJSON;
  /**
   * Canvas internal constant customization
   * 画布内部常量自定义
   */
  constants?: Record<string, any>;
  /**
   * i18n
   * 国际化
   */
  i18n?: I18nPluginOptions;
}

export namespace EditorProps {
  /**
   * 默认配置
   */
  export const DEFAULT: EditorProps = {
    background: {},
  };
}
