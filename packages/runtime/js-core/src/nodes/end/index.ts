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

export class EndExecutor implements INodeExecutor {
  public readonly type = FlowGramNode.End;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    context.runtime.ioCenter.setOutputs(context.inputs);
    return {
      outputs: context.inputs,
    };
  }
}
