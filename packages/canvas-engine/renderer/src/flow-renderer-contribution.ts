/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { FlowRendererRegistry } from './flow-renderer-registry';

export const FlowRendererContribution = Symbol('FlowRendererContribution');

export interface FlowRendererContribution {
  registerRenderer?(registry: FlowRendererRegistry): void;
}
