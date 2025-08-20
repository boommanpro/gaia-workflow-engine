/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService, PluginContext } from '@flowgram.ai/editor';

import { FreeLayoutPluginContext } from '../preset';

export function useClientContext(): FreeLayoutPluginContext {
  return useService<FreeLayoutPluginContext>(PluginContext);
}
