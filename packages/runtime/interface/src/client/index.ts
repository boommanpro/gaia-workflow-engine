/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type {
  FlowGramAPIName,
  TaskCancelInput,
  TaskCancelOutput,
  TaskReportInput,
  TaskReportOutput,
  TaskResultInput,
  TaskResultOutput,
  TaskRunInput,
  TaskRunOutput,
  TaskValidateInput,
  TaskValidateOutput,
} from '@api/index';

export interface IRuntimeClient {
  [FlowGramAPIName.TaskRun]: (input: TaskRunInput) => Promise<TaskRunOutput | undefined>;
  [FlowGramAPIName.TaskReport]: (input: TaskReportInput) => Promise<TaskReportOutput | undefined>;
  [FlowGramAPIName.TaskResult]: (input: TaskResultInput) => Promise<TaskResultOutput | undefined>;
  [FlowGramAPIName.TaskCancel]: (input: TaskCancelInput) => Promise<TaskCancelOutput | undefined>;
  [FlowGramAPIName.TaskValidate]: (
    input: TaskValidateInput
  ) => Promise<TaskValidateOutput | undefined>;
}
