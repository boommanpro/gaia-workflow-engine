/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowGramAPIDefines } from './type';
import { TaskValidateDefine } from './task-validate';
import { TaskRunDefine } from './task-run';
import { TaskResultDefine } from './task-result';
import { TaskReportDefine } from './task-report';
import { TaskCancelDefine } from './task-cancel';
import { ServerInfoDefine } from './server-info';
import { FlowGramAPIName } from './constant';

export const FlowGramAPIs: FlowGramAPIDefines = {
  [FlowGramAPIName.ServerInfo]: ServerInfoDefine,
  [FlowGramAPIName.TaskRun]: TaskRunDefine,
  [FlowGramAPIName.TaskReport]: TaskReportDefine,
  [FlowGramAPIName.TaskResult]: TaskResultDefine,
  [FlowGramAPIName.TaskCancel]: TaskCancelDefine,
  [FlowGramAPIName.TaskValidate]: TaskValidateDefine,
};

export const FlowGramAPINames = Object.keys(FlowGramAPIs) as FlowGramAPIName[];
