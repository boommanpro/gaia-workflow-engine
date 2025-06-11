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
