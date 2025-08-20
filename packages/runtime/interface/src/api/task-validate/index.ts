/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import z from 'zod';

import { ValidationResult, WorkflowInputs } from '@runtime/index';
import { FlowGramAPIDefine } from '@api/type';
import { WorkflowZodSchema } from '@api/schema';
import { FlowGramAPIMethod, FlowGramAPIModule, FlowGramAPIName } from '@api/constant';

export interface TaskValidateInput {
  inputs: WorkflowInputs;
  schema: string;
}

export interface TaskValidateOutput extends ValidationResult {}

export const TaskValidateDefine: FlowGramAPIDefine = {
  name: FlowGramAPIName.TaskValidate,
  method: FlowGramAPIMethod.POST,
  path: '/task/validate',
  module: FlowGramAPIModule.Task,
  schema: {
    input: z.object({
      schema: z.string(),
      inputs: WorkflowZodSchema.Inputs,
    }),
    output: z.object({
      valid: z.boolean(),
      errors: z.array(z.string()).optional(),
    }),
  },
};
