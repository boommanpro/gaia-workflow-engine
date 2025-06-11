import z from 'zod';

import { IReport } from '@runtime/index';
import { FlowGramAPIDefine } from '@api/type';
import { WorkflowZodSchema } from '@api/schema';
import { FlowGramAPIName, FlowGramAPIMethod, FlowGramAPIModule } from '@api/constant';

export interface TaskReportInput {
  taskID: string;
}

export type TaskReportOutput = IReport | undefined;

export const TaskReportDefine: FlowGramAPIDefine = {
  name: FlowGramAPIName.TaskReport,
  method: FlowGramAPIMethod.GET,
  path: '/task/report',
  module: FlowGramAPIModule.Task,
  schema: {
    input: z.object({
      taskID: z.string(),
    }),
    output: z.object({
      id: z.string(),
      inputs: WorkflowZodSchema.Inputs,
      outputs: WorkflowZodSchema.Outputs,
      workflowStatus: WorkflowZodSchema.Status,
      reports: z.record(z.string(), WorkflowZodSchema.NodeReport),
    }),
  },
};
