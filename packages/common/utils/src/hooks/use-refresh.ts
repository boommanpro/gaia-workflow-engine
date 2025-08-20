/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';

export function useRefresh(defaultValue?: any): (v?: any) => void {
  const [, update] = useState<any>(defaultValue);
  return useCallback((v?: any) => update(v !== undefined ? v : {}), []);
}
