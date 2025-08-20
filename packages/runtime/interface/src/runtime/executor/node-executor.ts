/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowGramNode } from '@node/index';
import { ISnapshot } from '../snapshot';
import { INode } from '../document';
import { IContext } from '../context';
import { IContainer } from '../container';
import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface ExecutionContext {
  node: INode;
  inputs: WorkflowInputs;
  container: IContainer;
  runtime: IContext;
  snapshot: ISnapshot;
}

export interface ExecutionResult {
  outputs: WorkflowOutputs;
  branch?: string;
}

export interface INodeExecutor {
  type: FlowGramNode;
  execute: (context: ExecutionContext) => Promise<ExecutionResult>;
}

export interface INodeExecutorFactory {
  new (): INodeExecutor;
}
