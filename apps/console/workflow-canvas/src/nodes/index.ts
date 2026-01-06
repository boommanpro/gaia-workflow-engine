/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRegistry } from '../typings';
import { WorkflowNodeRegistry } from './workflow';
import { VariableNodeRegistry } from './variable';
import { StringFormatNodeRegistry } from './string-format';
import { StartNodeRegistry } from './start';
import { LoopNodeRegistry } from './loop';
import { LLMNodeRegistry } from './llm';
import { HTTPNodeRegistry } from './http';
import { GroupNodeRegistry } from './group';
import { EndNodeRegistry } from './end';
import { ContinueNodeRegistry } from './continue';
import { ConditionNodeRegistry } from './condition';
import { CommentNodeRegistry } from './comment';
import { CodeNodeRegistry } from './code';
import { BreakNodeRegistry } from './break';
import { BranchNodeRegistry } from './branches';
import { BlockStartNodeRegistry } from './block-start';
import { BlockEndNodeRegistry } from './block-end';
import { AssigneeNodeRegistry } from './assignee';

export { WorkflowNodeType } from './constants';

export const nodeRegistries: FlowNodeRegistry[] = [
  ConditionNodeRegistry,
  StartNodeRegistry,
  EndNodeRegistry,
  LLMNodeRegistry,
  LoopNodeRegistry,
  CommentNodeRegistry,
  BlockStartNodeRegistry,
  BlockEndNodeRegistry,
  HTTPNodeRegistry,
  CodeNodeRegistry,
  ContinueNodeRegistry,
  BreakNodeRegistry,
  VariableNodeRegistry,
  GroupNodeRegistry,
  BranchNodeRegistry,
  StringFormatNodeRegistry,
  WorkflowNodeRegistry,
  AssigneeNodeRegistry,
];
