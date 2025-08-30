/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum WorkflowNodeType {
  Start = 'start',
  End = 'end',
  Note = 'note',
  LLM = 'llm',
  HTTP = 'http',
  Code = 'code',
  Variable = 'variable',
  Condition = 'condition',
  Branches = 'branches',
  Loop = 'loop',
  BlockStart = 'block-start',
  BlockEnd = 'block-end',
  Comment = 'comment',
  Continue = 'continue',
  Break = 'break',
}
