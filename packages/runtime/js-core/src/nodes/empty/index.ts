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

export class BlockStartExecutor implements INodeExecutor {
  public readonly type = FlowGramNode.BlockStart;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return {
      outputs: {},
    };
  }
}

export class BlockEndExecutor implements INodeExecutor {
  public type = FlowGramNode.BlockEnd;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return {
      outputs: {},
    };
  }
}
