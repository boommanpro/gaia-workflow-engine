/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IValidation } from '@runtime/validation';
import { ITask } from '../task';
import { IExecutor } from '../executor';
import { INode } from '../document';
import { IContext } from '../context';
import { InvokeParams } from '../base';

export interface EngineServices {
  Validation: IValidation;
  Executor: IExecutor;
}

export interface IEngine {
  invoke(params: InvokeParams): ITask;
  executeNode(params: { context: IContext; node: INode }): Promise<void>;
}

export const IEngine = Symbol.for('Engine');
