import z from 'zod';

import { WorkflowInputs } from '@runtime/index';
import { FlowGramAPIDefine } from '@api/type';
import { WorkflowZodSchema } from '@api/schema';
import { FlowGramAPIMethod, FlowGramAPIModule, FlowGramAPIName } from '@api/constant';

export interface TaskRunInput {
  inputs: WorkflowInputs;
  schema: string;
}

export interface TaskRunOutput {
  taskID: string;
}

export const TaskRunDefine: FlowGramAPIDefine = {
  name: FlowGramAPIName.TaskRun,
  method: FlowGramAPIMethod.POST,
  path: '/task/run',
  module: FlowGramAPIModule.Task,
  schema: {
    input: z.object({
      schema: z.string(),
      inputs: WorkflowZodSchema.Inputs,
    }),
    output: z.object({
      taskID: z.string(),
    }),
  },
};
