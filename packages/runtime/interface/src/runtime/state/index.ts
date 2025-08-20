/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  IFlowValue,
  IFlowRefValue,
  WorkflowVariableType,
  IFlowTemplateValue,
  IJsonSchema,
} from '@schema/index';
import { IVariableParseResult, IVariableStore } from '../variable';
import { INode } from '../document';
import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface IState {
  id: string;
  variableStore: IVariableStore;
  init(): void;
  dispose(): void;
  getNodeInputs(node: INode): WorkflowInputs;
  setNodeOutputs(params: { node: INode; outputs: WorkflowOutputs }): void;
  parseInputs(params: { values: Record<string, IFlowValue>; declare: IJsonSchema }): WorkflowInputs;
  parseRef<T = unknown>(ref: IFlowRefValue): IVariableParseResult<T> | null;
  parseTemplate(template: IFlowTemplateValue): IVariableParseResult<string> | null;
  parseValue<T = unknown>(
    flowValue: IFlowValue,
    type?: WorkflowVariableType
  ): IVariableParseResult<T> | null;
  isExecutedNode(node: INode): boolean;
  addExecutedNode(node: INode): void;
}
