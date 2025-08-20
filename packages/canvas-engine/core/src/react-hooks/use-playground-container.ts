/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { type interfaces } from 'inversify';

import { PlaygroundReactContainerContext } from '../react/playground-react-context';

/**
 * 获取 playground inversify container
 */
export function usePlaygroundContainer(): interfaces.Container {
  return React.useContext(PlaygroundReactContainerContext);
}
