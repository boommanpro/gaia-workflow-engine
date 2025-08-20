/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowValue, IJsonSchema, PositionSchema } from '@schema/index';
import { FlowGramNode } from '@node/constant';
import { IPort } from './port';
import { IEdge } from './edge';

export interface NodeDeclare {
  inputsValues?: Record<string, IFlowValue>;
  inputs?: IJsonSchema;
  outputs?: IJsonSchema;
}

export interface INode<T = any> {
  id: string;
  type: FlowGramNode;
  name: string;
  position: PositionSchema;
  declare: NodeDeclare;
  data: T;
  ports: {
    inputs: IPort[];
    outputs: IPort[];
  };
  edges: {
    inputs: IEdge[];
    outputs: IEdge[];
  };
  parent: INode | null;
  children: INode[];
  prev: INode[];
  next: INode[];
  successors: INode[];
  predecessors: INode[];
  isBranch: boolean;
}

export interface CreateNodeParams {
  id: string;
  type: FlowGramNode;
  name: string;
  position: PositionSchema;
  variable?: NodeDeclare;
  data?: any;
}
