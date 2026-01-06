/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowGramAPIName, IRuntimeClient } from '@flowgram.ai/runtime-interface';
import { injectable } from '@flowgram.ai/free-layout-editor';

@injectable()
export class WorkflowRuntimeClient implements IRuntimeClient {
  constructor() {}

  public [FlowGramAPIName.TaskRun]: IRuntimeClient[FlowGramAPIName.TaskRun];

  public [FlowGramAPIName.TaskReport]: IRuntimeClient[FlowGramAPIName.TaskReport];

  public [FlowGramAPIName.TaskResult]: IRuntimeClient[FlowGramAPIName.TaskResult];

  public [FlowGramAPIName.TaskCancel]: IRuntimeClient[FlowGramAPIName.TaskCancel];

  public [FlowGramAPIName.TaskValidate]: IRuntimeClient[FlowGramAPIName.TaskValidate];
}
