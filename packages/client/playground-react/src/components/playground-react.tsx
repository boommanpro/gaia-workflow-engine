/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, forwardRef } from 'react';

import {
  createPlaygroundPlugin,
  PlaygroundReactProvider,
  PlaygroundReactRenderer,
  PluginContext,
} from '@flowgram.ai/core';

import { PlaygroundReactProps, createPlaygroundReactPreset } from '../preset';
import { PlaygroundContentLayer } from '../layers/playground-content-layer';

export type PlaygroundRef = PluginContext;

export const PlaygroundReact = forwardRef<PlaygroundRef, PlaygroundReactProps>(
  function PlaygroundReact(props, ref) {
    const { parentContainer, children, ...others } = props;
    const contentLoadPlugin = useMemo(
      () =>
        createPlaygroundPlugin({
          onInit(ctx) {
            ctx.playground.registerLayer(PlaygroundContentLayer);
          },
        }),
      [],
    );
    const preset = useMemo(() => createPlaygroundReactPreset(others, [contentLoadPlugin]), []);
    return (
      <PlaygroundReactProvider ref={ref} plugins={preset} parentContainer={parentContainer}>
        <PlaygroundReactRenderer>{children}</PlaygroundReactRenderer>
      </PlaygroundReactProvider>
    );
  },
);
