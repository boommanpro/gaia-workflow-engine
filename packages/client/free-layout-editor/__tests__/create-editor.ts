/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';
import {
  createPlaygroundContainer,
  Playground,
  loadPlugins,
  PluginContext,
  createPluginContextDefault,
  FlowDocument,
} from '@flowgram.ai/editor';

import { FreeLayoutPluginContext, FreeLayoutProps, createFreeLayoutPreset } from '../src';

export function createEditor(opts: FreeLayoutProps): interfaces.Container {
  const container = createPlaygroundContainer();

  const playground = container.get(Playground);
  const preset = createFreeLayoutPreset(opts);
  const customPluginContext = (container: interfaces.Container) =>
    ({
      ...createPluginContextDefault(container),
      get document(): FlowDocument {
        return container.get<FlowDocument>(FlowDocument);
      },
    } as FreeLayoutPluginContext);

  const ctx = customPluginContext(container);
  container.rebind(PluginContext).toConstantValue(ctx);
  loadPlugins(preset(ctx), container);
  playground.init();
  return container;
}
