/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowPortType } from '@schema/index';
import { INode } from './node';
import { IEdge } from './edge';

export interface IPort {
  id: string;
  node: INode;
  edges: IEdge[];
  type: WorkflowPortType;
}

export interface CreatePortParams {
  id: string;
  node: INode;
  type: WorkflowPortType;
}
