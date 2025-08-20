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

export class StartExecutor implements INodeExecutor {
  public readonly type = FlowGramNode.Start;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return {
      outputs: context.runtime.ioCenter.inputs,
    };
  }
}
