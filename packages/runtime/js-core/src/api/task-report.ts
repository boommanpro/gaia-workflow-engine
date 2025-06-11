/* eslint-disable no-console */
import {
  TaskReportInput,
  TaskReportOutput,
  TaskReportDefine,
} from '@flowgram.ai/runtime-interface';

import { WorkflowApplication } from '@application/workflow';

export const TaskReportAPI = async (input: TaskReportInput): Promise<TaskReportOutput> => {
  const app = WorkflowApplication.instance;
  const { taskID } = input;
  const output: TaskReportOutput = app.report(taskID);
  try {
    TaskReportDefine.schema.output.parse(output);
  } catch (e) {
    console.log('> TaskReportAPI - output: ', JSON.stringify(output));
    console.error(e);
  }
  return output;
};
