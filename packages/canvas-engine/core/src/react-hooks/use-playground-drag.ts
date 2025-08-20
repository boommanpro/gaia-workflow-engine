/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from 'react';

import { Disposable } from '@flowgram.ai/utils';

import { PlaygroundDragOptions, PlaygroundDrag } from '../core';
import { usePlayground } from './use-playground';

interface UsePlaygroundDragReturn {
  start<T = undefined>(
    e: { clientX: number; clientY: number },
    opts: PlaygroundDragOptions<T> & { context?: T },
  ): Disposable;
}

export function usePlaygroundDrag(): UsePlaygroundDragReturn {
  const playground = usePlayground();
  return useMemo(
    () => ({
      start<T>(
        e: { clientX: number; clientY: number },
        opts: PlaygroundDragOptions<T> & { context?: T },
      ): Disposable {
        return PlaygroundDrag.startDrag(e.clientX, e.clientY, {
          ...opts,
          config: playground.config,
        });
      },
    }),
    [],
  );
}
