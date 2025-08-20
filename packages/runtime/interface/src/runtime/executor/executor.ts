/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ExecutionContext, ExecutionResult, INodeExecutor } from './node-executor';

export interface IExecutor {
  execute: (context: ExecutionContext) => Promise<ExecutionResult>;
  register: (executor: INodeExecutor) => void;
}

export const IExecutor = Symbol.for('Executor');
