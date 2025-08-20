/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useCallback, forwardRef } from 'react';

import { interfaces } from 'inversify';
import { WorkflowDocument, fitView } from '@flowgram.ai/free-layout-core';
import { HistoryService } from '@flowgram.ai/free-history-plugin';
import {
  PlaygroundReactProvider,
  createPluginContextDefault,
  ClipboardService,
  SelectionService,
  Playground,
} from '@flowgram.ai/editor';

import { WorkflowAutoLayoutTool } from '../tools';
import {
  createFreeLayoutPreset,
  FreeLayoutPluginContext,
  FreeLayoutPluginTools,
  FreeLayoutProps,
} from '../preset';

export const FreeLayoutEditorProvider = forwardRef<FreeLayoutPluginContext, FreeLayoutProps>(
  function FreeLayoutEditorProvider(props: FreeLayoutProps, ref) {
    const { children, ...others } = props;
    const preset = useMemo(() => createFreeLayoutPreset(others), []);
    const customPluginContext = useCallback(
      (container: interfaces.Container) =>
        ({
          ...createPluginContextDefault(container),
          get document(): WorkflowDocument {
            return container.get<WorkflowDocument>(WorkflowDocument);
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
          get tools(): FreeLayoutPluginTools {
            const autoLayoutTool = container.get<WorkflowAutoLayoutTool>(WorkflowAutoLayoutTool);
            return {
              autoLayout: autoLayoutTool.handle.bind(autoLayoutTool),
              fitView: (easing?: boolean) =>
                fitView(
                  container.get<WorkflowDocument>(WorkflowDocument),
                  container.get<Playground>(Playground).config,
                  easing
                ),
            };
          },
        } as FreeLayoutPluginContext),
      []
    );
    return (
      <PlaygroundReactProvider ref={ref} plugins={preset} customPluginContext={customPluginContext}>
        {children}
      </PlaygroundReactProvider>
    );
  }
);
