/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IContext } from '../context';
import { WorkflowOutputs } from '../base';

export interface ITask {
  id: string;
  processing: Promise<WorkflowOutputs>;
  context: IContext;
  cancel(): void;
}

export interface TaskParams {
  processing: Promise<WorkflowOutputs>;
  context: IContext;
}
