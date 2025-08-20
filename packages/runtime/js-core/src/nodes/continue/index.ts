/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  INodeExecutor,
} from '@flowgram.ai/runtime-interface';

export class ContinueExecutor implements INodeExecutor {
  public type = FlowGramNode.Continue;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    context.runtime.cache.set('loop-continue', true);
    return {
      outputs: {},
    };
  }
}
