/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ReactiveState } from '../core/reactive-state';
import { useObserve } from './use-observe';

export function useReadonlyReactiveState<T extends Record<string, any>>(
  state: ReactiveState<T>,
): Readonly<T> {
  return useObserve<T>(state.readonlyValue);
}
