/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { validateInputsSchema } from './validate-inputs';
import { twoLLMSchema } from './two-llm';
import { startDefaultSchema } from './start-default';
import { loopBreakContinueSchema } from './loop-break-continue';
import { loopSchema } from './loop';
import { llmRealSchema } from './llm-real';
import { httpSchema } from './http';
import { globalVariableSchema } from './global-variable';
import { endConstantSchema } from './end-constant';
import { codeSchema } from './code';
import { branchTwoLayersSchema } from './branch-two-layers';
import { branchSchema } from './branch';
import { basicSchema } from './basic';

export const TestSchemas = {
  twoLLMSchema,
  basicSchema,
  branchSchema,
  llmRealSchema,
  loopSchema,
  loopBreakContinueSchema,
  branchTwoLayersSchema,
  validateInputsSchema,
  httpSchema,
  codeSchema,
  endConstantSchema,
  startDefaultSchema,
  globalVariableSchema,
};
