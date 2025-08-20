/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService, PluginContext } from '@flowgram.ai/editor';

import { FixedLayoutPluginContext } from '../preset';

export function useClientContext(): FixedLayoutPluginContext {
  return useService<FixedLayoutPluginContext>(PluginContext);
}
