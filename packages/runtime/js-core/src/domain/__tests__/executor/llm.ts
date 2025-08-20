/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ExecutionContext, ExecutionResult } from '@flowgram.ai/runtime-interface';

import { LLMExecutor, LLMExecutorInputs } from '@nodes/llm';
import { delay } from '@infra/utils';

export class MockLLMExecutor extends LLMExecutor {
  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const inputs = context.inputs as LLMExecutorInputs;
    this.checkInputs(inputs);
    await delay(10); // TODO mock node run
    const result = `Hi, I am an AI model, my name is ${inputs.modelName}, temperature is ${inputs.temperature}, system prompt is "${inputs.systemPrompt}", prompt is "${inputs.prompt}"`;
    return {
      outputs: {
        result,
      },
    };
  }
}
