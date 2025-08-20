/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { OperationRegistry } from './operation-registry';

export const OperationContribution = Symbol('OperationContribution');

export interface OperationContribution {
  registerOperationMeta?(operationRegistry: OperationRegistry): void;
}
