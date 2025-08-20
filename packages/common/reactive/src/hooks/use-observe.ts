/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo } from 'react';

import { useRefresh } from '@flowgram.ai/utils';

import { createProxy } from '../utils/create-proxy';
import { Tracker } from '../core/tracker';

import Computation = Tracker.Computation;

export function useObserve<T extends Record<string, any>>(value: T | undefined): T {
  const refresh = useRefresh();
  const computationMap = useMemo<Map<string, Computation>>(() => new Map(), []);
  const clear = useCallback(() => {
    computationMap.forEach((comp) => comp.stop());
    computationMap.clear();
  }, []);
  useEffect(() => clear, []);
  // 重新渲染需要清空依赖
  clear();
  return useMemo(() => {
    if (value === undefined) return {} as T;
    return createProxy(value, {
      get(target, key: string) {
        let computation = computationMap.get(key);
        if (!computation) {
          computation = new Tracker.Computation((c) => {
            if (!c.firstRun) {
              refresh();
              return;
            }
            return value[key];
          });
          computationMap.set(key, computation);
        }
        return value[key];
      },
    });
  }, [value]);
}
