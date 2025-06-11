/* eslint-disable no-console */
import { TaskCancelAPI, TaskReportAPI, TaskResultAPI, TaskRunAPI } from '@flowgram.ai/runtime-js';
import { FlowGramAPIName, IRuntimeClient } from '@flowgram.ai/runtime-interface';
import { injectable } from '@flowgram.ai/free-layout-editor';

@injectable()
export class WorkflowRuntimeClient implements IRuntimeClient {
  constructor() {}

  public [FlowGramAPIName.TaskRun]: IRuntimeClient[FlowGramAPIName.TaskRun] = TaskRunAPI;

  public [FlowGramAPIName.TaskReport]: IRuntimeClient[FlowGramAPIName.TaskReport] = TaskReportAPI;

  public [FlowGramAPIName.TaskResult]: IRuntimeClient[FlowGramAPIName.TaskResult] = TaskResultAPI;

  public [FlowGramAPIName.TaskCancel]: IRuntimeClient[FlowGramAPIName.TaskCancel] = TaskCancelAPI;
}
