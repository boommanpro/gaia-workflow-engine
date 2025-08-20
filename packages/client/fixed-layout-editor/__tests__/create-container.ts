/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';
import { HistoryService } from '@flowgram.ai/fixed-history-plugin';
import {
  createPlaygroundContainer,
  Playground,
  loadPlugins,
  PluginContext,
  createPluginContextDefault,
  FlowDocument,
  EditorProps,
} from '@flowgram.ai/editor';

import {
  FixedLayoutPluginContext,
  FixedLayoutProps,
  FlowOperationService,
  createFixedLayoutPreset,
} from '../src';

export function createContainer(opts: FixedLayoutProps): interfaces.Container {
  const container = createPlaygroundContainer();

  const playground = container.get(Playground);
  const preset = createFixedLayoutPreset(opts);
  const customPluginContext = (container: interfaces.Container) =>
    ({
      ...createPluginContextDefault(container),
      get document(): FlowDocument {
        return container.get<FlowDocument>(FlowDocument);
      },
    } as FixedLayoutPluginContext);

  const ctx = customPluginContext(container);
  container.rebind(PluginContext).toConstantValue(ctx);
  loadPlugins(preset(ctx), container);
  playground.init();
  return container;
}

export function createHistoryContainer(props: EditorProps = {}) {
  const container = createContainer({
    history: {
      enable: true,
    },
    ...props,
  });

  const flowDocument = container.get<FlowDocument>(FlowDocument);
  const flowOperationService = container.get<FlowOperationService>(FlowOperationService);
  const historyService = container.get<HistoryService>(HistoryService);

  return {
    flowDocument,
    flowOperationService,
    historyService,
  };
}
