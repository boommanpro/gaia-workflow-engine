/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowGramAPIName } from '@flowgram.ai/runtime-interface';

import { TaskValidateAPI } from './task-validate';
import { TaskRunAPI } from './task-run';
import { TaskResultAPI } from './task-result';
import { TaskReportAPI } from './task-report';
import { TaskCancelAPI } from './task-cancel';

export { TaskRunAPI, TaskResultAPI, TaskReportAPI, TaskCancelAPI, TaskValidateAPI };

export const WorkflowRuntimeAPIs: Record<FlowGramAPIName, (i: any) => any> = {
  [FlowGramAPIName.ServerInfo]: () => {}, // TODO
  [FlowGramAPIName.TaskRun]: TaskRunAPI,
  [FlowGramAPIName.TaskReport]: TaskReportAPI,
  [FlowGramAPIName.TaskResult]: TaskResultAPI,
  [FlowGramAPIName.TaskCancel]: TaskCancelAPI,
  [FlowGramAPIName.TaskValidate]: TaskValidateAPI,
};
