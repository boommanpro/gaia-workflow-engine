/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Event, Disposable } from '@flowgram.ai/utils';

import { BaseVariableField, VariableDeclaration } from '../ast';
import { type Scope } from './scope';
// 获取所有作用域的参数
export interface GetAllScopeParams {
  // 是否排序
  sort?: boolean;
}
export interface ScopeChangeAction {
  type: 'add' | 'delete' | 'update' | 'available';
  scope: Scope;
}

export interface IVariableTable extends Disposable {
  parentTable?: IVariableTable; // 父变量表，会包含所有子表的变量
  onDataChange: Event<void>;
  version: number;
  variables: VariableDeclaration[];
  variableKeys: string[];
  fireChange(): void;
  getByKeyPath(keyPath: string[]): BaseVariableField | undefined;
  getVariableByKey(key: string): VariableDeclaration | undefined;
  // 方法不对外透出，仅内部使用
  // addVariableToTable(variable: VariableDeclaration): void;
  // removeVariableFromTable(key: string): void;
  dispose(): void;
  onVariableListChange(observer: (variables: VariableDeclaration[]) => void): Disposable;
  onAnyVariableChange(observer: (changedVariable: VariableDeclaration) => void): Disposable;
  onListOrAnyVarChange(observer: () => void): Disposable;
}
