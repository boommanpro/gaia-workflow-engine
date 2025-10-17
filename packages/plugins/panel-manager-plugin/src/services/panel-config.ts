/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PluginContext } from '@flowgram.ai/core';

import type { PanelFactory, PanelConfig } from '../types';

export interface PanelManagerConfig {
  factories: PanelFactory<any>[];
  right: PanelConfig;
  bottom: PanelConfig;
  getPopupContainer: (ctx: PluginContext) => HTMLElement; // default playground.node.parentElement
  autoResize: boolean;
}

export const PanelManagerConfig = Symbol('PanelManagerConfig');

export const defineConfig = (config: Partial<PanelManagerConfig>) => {
  const defaultConfig: PanelManagerConfig = {
    right: {
      max: 1,
    },
    bottom: {
      max: 1,
    },
    factories: [],
    getPopupContainer: (ctx: PluginContext) => ctx.playground.node.parentNode as HTMLElement,
    autoResize: true,
  };
  return {
    ...defaultConfig,
    ...config,
  };
};
