/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { INodeExecutorFactory } from '@flowgram.ai/runtime-interface';

import { StartExecutor } from '@nodes/start';
import { EndExecutor } from '@nodes/end';
import { ConditionExecutor } from '@nodes/condition';
import { MockLLMExecutor } from './llm';

export const MockWorkflowRuntimeNodeExecutors: INodeExecutorFactory[] = [
  StartExecutor,
  EndExecutor,
  MockLLMExecutor,
  ConditionExecutor,
];
