/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type NodeManager } from './node-manager';

export const NodeContribution = Symbol('NodeContribution');

export interface NodeContribution {
  onRegister?(nodeManager: NodeManager): void;
}
