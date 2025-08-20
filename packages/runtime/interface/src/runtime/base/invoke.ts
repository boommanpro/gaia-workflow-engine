/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@schema/index';
import { WorkflowInputs } from './inputs-outputs';

export interface InvokeParams {
  schema: WorkflowSchema;
  inputs: WorkflowInputs;
}

export type WorkflowRuntimeInvoke = (params: InvokeParams) => Promise<WorkflowInputs>;
