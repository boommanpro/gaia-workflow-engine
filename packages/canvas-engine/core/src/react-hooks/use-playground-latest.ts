/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { Playground } from '../playground';

/**
 * 从外部动态获取最新的 playground
 */
export function usePlaygroundLatest(): Playground | undefined {
  const [playground, updatePlayground] = useState<Playground | undefined>(() =>
    Playground.getLatest(),
  );
  useEffect(() => {
    const newPlayground = Playground.getLatest();
    if (newPlayground !== playground) {
      updatePlayground(newPlayground);
    }
    const dispose = Playground.onInstanceCreate(p => {
      updatePlayground(p);
    });
    const dispose2 = Playground.onInstanceDispose(playgroundDisposed => {
      if (playground === playgroundDisposed) {
        updatePlayground(undefined);
      }
    });
    return () => {
      dispose.dispose();
      dispose2.dispose();
    };
  }, [playground]);
  return playground;
}
