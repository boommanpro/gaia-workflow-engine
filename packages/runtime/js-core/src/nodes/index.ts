import { INodeExecutorFactory } from '@flowgram.ai/runtime-interface';

import { StartExecutor } from './start';
import { LoopExecutor } from './loop';
import { LLMExecutor } from './llm';
import { EndExecutor } from './end';
import { ConditionExecutor } from './condition';

export const WorkflowRuntimeNodeExecutors: INodeExecutorFactory[] = [
  StartExecutor,
  EndExecutor,
  LLMExecutor,
  ConditionExecutor,
  LoopExecutor,
];
