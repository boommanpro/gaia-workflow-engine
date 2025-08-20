/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { TaskValidateInput, TaskValidateOutput } from '@flowgram.ai/runtime-interface';

import { WorkflowApplication } from '@application/workflow';

export const TaskValidateAPI = async (input: TaskValidateInput): Promise<TaskValidateOutput> => {
  const app = WorkflowApplication.instance;
  const { schema: stringSchema, inputs } = input;
  const schema = JSON.parse(stringSchema);
  const result = app.validate({
    schema,
    inputs,
  });
  const output: TaskValidateOutput = result;
  return output;
};
