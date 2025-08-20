/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';

import { useRefresh } from '@flowgram.ai/core';

import { useCurrentScope } from '../context';
import { ScopeAvailableData } from '../../scope/datas';

/**
 * 获取作用域的可访问变量
 */
export function useScopeAvailable(): ScopeAvailableData {
  const scope = useCurrentScope();
  const refresh = useRefresh();

  useEffect(() => {
    const disposable = scope.available.onDataChange(() => {
      refresh();
    });

    return () => disposable.dispose();
  }, []);

  return scope.available;
}
