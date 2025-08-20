/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { PlaygroundReactRefContext } from '../react/playground-react-context';
import { Playground } from '../playground';

/**
 * 获取 playground
 */
export function usePlayground(): Playground {
  return React.useContext(PlaygroundReactRefContext);
}
