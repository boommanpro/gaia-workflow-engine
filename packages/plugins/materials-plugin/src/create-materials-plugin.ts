import React from 'react';

import { FlowRendererKey, FlowRendererRegistry } from '@flowgram.ai/renderer';
import { definePluginCreator } from '@flowgram.ai/core';

export type MaterialReactComponent<T = any> = (props: T) => React.ReactNode | null;

export interface MaterialsPluginOptions {
  /**
   * 注册特定的 UI 组件
   */
  components?: Record<FlowRendererKey | string, MaterialReactComponent>;
  /**
   * 注册特定的节点渲染组件
   */
  renderNodes?: Record<string, MaterialReactComponent>;
  /**
   * 默认节点渲染
   */
  renderDefaultNode?: MaterialReactComponent;
  /**
   * 注册渲染的文字
   */
  renderTexts?: Record<string, string>;
}

export const createMaterialsPlugin = definePluginCreator<MaterialsPluginOptions>({
  onInit(ctx, opts) {
    const registry = ctx.get<FlowRendererRegistry>(FlowRendererRegistry);
    /**
     * 注册默认节点渲染
     */
    registry.registerReactComponent(
      FlowRendererKey.NODE_RENDER,
      opts.renderDefaultNode || (() => null)
    );

    /**
     * 注册文案
     */
    if (opts.renderTexts) {
      registry.registerText(opts.renderTexts);
    }
    /**
     * 注册组件
     */
    if (opts.components) {
      Object.keys(opts.components).forEach((key) =>
        registry.registerReactComponent(key, opts.components![key])
      );
    }
    /**
     * 注册单节点渲染
     */
    if (opts.renderNodes) {
      Object.keys(opts.renderNodes).forEach((key) =>
        registry.registerReactComponent(key, opts.renderNodes![key])
      );
    }
  },
});
