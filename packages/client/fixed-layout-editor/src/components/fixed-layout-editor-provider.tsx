/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useCallback, forwardRef } from 'react';

import { interfaces } from 'inversify';
import { HistoryService } from '@flowgram.ai/history';
import {
  FlowDocument,
  createPluginContextDefault,
  PlaygroundReactProvider,
  ClipboardService,
  SelectionService,
  Playground,
} from '@flowgram.ai/editor';

import { FlowOperationService } from '../types';
import {
  createFixedLayoutPreset,
  FixedLayoutPluginContext,
  FixedLayoutPluginTools,
  FixedLayoutProps,
} from '../preset';

export const FixedLayoutEditorProvider = forwardRef<FixedLayoutPluginContext, FixedLayoutProps>(
  function FixedLayoutEditorProvider(props: FixedLayoutProps, ref) {
    const { parentContainer, children, ...others } = props;
    const preset = useMemo(() => createFixedLayoutPreset(others), []);
    const customPluginContext = useCallback(
      (container: interfaces.Container) =>
        ({
          ...createPluginContextDefault(container),
          get document(): FlowDocument {
            return container.get<FlowDocument>(FlowDocument);
          },
          get operation(): FlowOperationService {
            return container.get<FlowOperationService>(FlowOperationService);
          },
          get clipboard(): ClipboardService {
            return container.get<ClipboardService>(ClipboardService);
          },
          get selection(): SelectionService {
            return container.get<SelectionService>(SelectionService);
          },
          get history(): HistoryService {
            return container.get<HistoryService>(HistoryService);
          },
          get tools(): FixedLayoutPluginTools {
            return {
              fitView: (easing?: boolean) => {
                const playgroundConfig = container.get<Playground>(Playground).config;
                const doc = container.get(FlowDocument);
                return playgroundConfig.fitView(doc.root.bounds, easing, 30);
              },
            };
          },
        } as FixedLayoutPluginContext),
      []
    );
    return (
      <PlaygroundReactProvider
        ref={ref}
        plugins={preset}
        customPluginContext={customPluginContext}
        parentContainer={parentContainer}
      >
        {children}
      </PlaygroundReactProvider>
    );
  }
);
