import { TaskRunInput, TaskRunOutput } from '@flowgram.ai/runtime-interface';

import { WorkflowApplication } from '@application/workflow';

export const TaskRunAPI = async (input: TaskRunInput): Promise<TaskRunOutput> => {
  const app = WorkflowApplication.instance;
  const { schema: stringSchema, inputs } = input;
  const schema = JSON.parse(stringSchema);
  const taskID = app.run({
    schema,
    inputs,
  });
  const output: TaskRunOutput = {
    taskID,
  };
  return output;
};
