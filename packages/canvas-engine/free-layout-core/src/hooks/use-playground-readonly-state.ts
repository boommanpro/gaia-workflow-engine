/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';

import { usePlayground, useRefresh } from '@flowgram.ai/core';
import { type Disposable } from '@flowgram.ai/utils';

/**
 * 获取 readonly 状态
 */
export function usePlaygroundReadonlyState(listenChange?: boolean): boolean {
  const playground = usePlayground();
  const refresh = useRefresh();
  useEffect(() => {
    let dispose: Disposable | undefined = undefined;
    if (listenChange) {
      dispose = playground.config.onReadonlyOrDisabledChange(() => refresh());
    }
    return () => dispose?.dispose();
  }, [listenChange]);
  return playground.config.readonly;
}
