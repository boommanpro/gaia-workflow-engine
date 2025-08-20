/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useCallback } from 'react';

import { interfaces } from 'inversify';
import { FlowDocument } from '@flowgram.ai/document';
import {
  PlaygroundReactProvider,
  createPluginContextDefault,
  SelectionService,
} from '@flowgram.ai/core';

import { EditorPluginContext, EditorProps, createDefaultPreset } from '../preset';

export const EditorProvider: React.FC<EditorProps> = (props: EditorProps) => {
  const { children, ...others } = props;
  const preset = useMemo(() => createDefaultPreset(others), []);
  const customPluginContext = useCallback(
    (container: interfaces.Container) =>
      ({
        ...createPluginContextDefault(container),
        get document(): FlowDocument {
          return container.get<FlowDocument>(FlowDocument);
        },
        get selection(): SelectionService {
          return container.get<SelectionService>(SelectionService);
        },
      } as EditorPluginContext),
    []
  );
  return (
    <PlaygroundReactProvider plugins={preset} customPluginContext={customPluginContext}>
      {children}
    </PlaygroundReactProvider>
  );
};
