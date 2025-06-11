import z from 'zod';

import { FlowGramAPIDefine } from '@api/type';
import { FlowGramAPIName, FlowGramAPIMethod, FlowGramAPIModule } from '@api/constant';

export interface TaskCancelInput {
  taskID: string;
}

export type TaskCancelOutput = {
  success: boolean;
};

export const TaskCancelDefine: FlowGramAPIDefine = {
  name: FlowGramAPIName.TaskCancel,
  method: FlowGramAPIMethod.PUT,
  path: '/task/cancel',
  module: FlowGramAPIModule.Task,
  schema: {
    input: z.object({
      taskID: z.string(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
  },
};
