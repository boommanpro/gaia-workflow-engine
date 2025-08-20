/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import {
  Command,
  PlaygroundReact,
  PlaygroundReactContent,
  PlaygroundReactProps,
} from '@flowgram.ai/playground-react';

import { PlaygroundTools } from './components/playground-tools';
import { StaticCard, DragableCard } from './components/card';

// Load style
import '@flowgram.ai/playground-react/index.css';

/**
 * The ability to zoom to provide an infinite canvas
 */
export function PlaygroundEditor(props: { className?: string }) {
  const playgroundProps = useMemo<PlaygroundReactProps>(
    () => ({
      background: true, // Background available
      playground: {
        ineractiveType: 'PAD', // MOUSE | PAD
      },
      // 自定义快捷键
      shortcuts(registry, ctx) {
        registry.addHandlers(
          /**
           * Zoom In
           */
          {
            commandId: Command.Default.ZOOM_IN,
            shortcuts: ['meta =', 'ctrl ='],
            execute: () => {
              ctx.playground.config.zoomin();
            },
          },
          /**
           * Zoom Out
           */
          {
            commandId: Command.Default.ZOOM_OUT,
            shortcuts: ['meta -', 'ctrl -'],
            execute: () => {
              ctx.playground.config.zoomout();
            },
          }
        );
      },
    }),
    []
  );
  /*
   * PlaygroundReact: Canvas React containers 画布 react 容器
   * PlaygroundReactContent: The canvas content will be scaled accordingly 画布内容，会跟着缩放
   */
  return (
    <div className={props.className}>
      <PlaygroundReact {...playgroundProps}>
        <PlaygroundReactContent>
          <StaticCard />
          <DragableCard />
        </PlaygroundReactContent>
        <PlaygroundTools />
      </PlaygroundReact>
    </div>
  );
}
