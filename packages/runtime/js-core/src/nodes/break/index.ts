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

export class BreakExecutor implements INodeExecutor {
  public type = FlowGramNode.Break;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    context.runtime.cache.set('loop-break', true);
    return {
      outputs: {},
    };
  }
}
