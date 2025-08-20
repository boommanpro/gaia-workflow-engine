/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { PlaygroundReactContext } from '../react/playground-react-context';

/**
 * 获取 playground context 数据
 */
export function usePlaygroundContext<T>(): T {
  return React.useContext(PlaygroundReactContext);
}
