/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowVariableType } from '@schema/index';

interface VariableTypeInfo {
  type: WorkflowVariableType;
  itemsType?: WorkflowVariableType;
}

export interface IVariable<T = Object> extends VariableTypeInfo {
  id: string;
  nodeID: string;
  key: string;
  value: T;
}

export interface IVariableParseResult<T = unknown> extends VariableTypeInfo {
  value: T;
  type: WorkflowVariableType;
}

export interface IVariableStore {
  id: string;
  store: Map<string, Map<string, IVariable>>;
  setParent(parent: IVariableStore): void;
  setVariable(
    params: {
      nodeID: string;
      key: string;
      value: unknown;
    } & VariableTypeInfo
  ): void;
  setValue(params: {
    nodeID: string;
    variableKey: string;
    variablePath?: string[];
    value: unknown;
  }): void;
  getValue<T = unknown>(params: {
    nodeID: string;
    variableKey: string;
    variablePath?: string[];
  }): IVariableParseResult<T> | null;
  init(): void;
  dispose(): void;
}
