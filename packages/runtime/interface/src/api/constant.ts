/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum FlowGramAPIMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum FlowGramAPIName {
  ServerInfo = 'ServerInfo',
  TaskRun = 'TaskRun',
  TaskReport = 'TaskReport',
  TaskResult = 'TaskResult',
  TaskCancel = 'TaskCancel',
  TaskValidate = 'TaskValidate',
}

export enum FlowGramAPIModule {
  Info = 'Info',
  Task = 'Task',
}
