/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { VariableTable } from '../variable-table';
import { IVariableTable } from '../types';
import { type Scope } from '../scope';
import { type VariableEngine } from '../../variable-engine';
import { createMemo } from '../../utils/memo';
import { NewASTAction } from '../../ast/types';
import { DisposeASTAction } from '../../ast/types';
import { ReSortVariableDeclarationsAction } from '../../ast/declaration/variable-declaration';
import { ASTKind, type VariableDeclaration } from '../../ast';

/**
 * 作用域输出
 */
export class ScopeOutputData {
  protected variableTable: IVariableTable;

  protected memo = createMemo();

  get variableEngine(): VariableEngine {
    return this.scope.variableEngine;
  }

  get globalVariableTable(): IVariableTable {
    return this.scope.variableEngine.globalVariableTable;
  }

  get version() {
    return this.variableTable.version;
  }

  /**
   * @deprecated use onListOrAnyVarChange instead
   */
  get onDataChange() {
    return this.variableTable.onDataChange.bind(this.variableTable);
  }

  /**
   * listen to variable list change
   */
  get onVariableListChange() {
    return this.variableTable.onVariableListChange.bind(this.variableTable);
  }

  /**
   * listen to any variable update in list
   */
  get onAnyVariableChange() {
    return this.variableTable.onAnyVariableChange.bind(this.variableTable);
  }

  /**
   * listen to variable list change + any variable update in list
   */
  get onListOrAnyVarChange() {
    return this.variableTable.onListOrAnyVarChange.bind(this.variableTable);
  }

  protected _hasChanges = false;

  constructor(public readonly scope: Scope) {
    // setup scope variable table based on globalVariableTable
    this.variableTable = new VariableTable(scope.variableEngine.globalVariableTable);

    this.scope.toDispose.pushAll([
      // When root AST node is updated, check if there are any changes during this AST change
      this.scope.ast.subscribe(() => {
        if (this._hasChanges) {
          this.memo.clear();
          this.notifyCoversChange();
          this.variableTable.fireChange();
          this._hasChanges = false;
        }
      }),
      this.scope.event.on<DisposeASTAction>('DisposeAST', (_action) => {
        if (_action.ast?.kind === ASTKind.VariableDeclaration) {
          this.removeVariableFromTable(_action.ast.key);
        }
      }),
      this.scope.event.on<NewASTAction>('NewAST', (_action) => {
        if (_action.ast?.kind === ASTKind.VariableDeclaration) {
          this.addVariableToTable(_action.ast as VariableDeclaration);
        }
      }),
      this.scope.event.on<ReSortVariableDeclarationsAction>('ReSortVariableDeclarations', () => {
        this._hasChanges = true;
      }),
      this.variableTable,
    ]);
  }

  /**
   * Scope Output Variable Declarations
   */
  get variables(): VariableDeclaration[] {
    return this.memo('variables', () =>
      this.variableTable.variables.sort((a, b) => a.order - b.order)
    );
  }

  /**
   * Output Variable Keys
   */
  get variableKeys(): string[] {
    return this.memo('variableKeys', () => this.variableTable.variableKeys);
  }

  addVariableToTable(variable: VariableDeclaration) {
    if (variable.scope !== this.scope) {
      throw Error('VariableDeclaration must be a ast node in scope');
    }

    (this.variableTable as VariableTable).addVariableToTable(variable);
    this._hasChanges = true;
  }

  removeVariableFromTable(key: string) {
    (this.variableTable as VariableTable).removeVariableFromTable(key);
    this._hasChanges = true;
  }

  getVariableByKey(key: string) {
    return this.variableTable.getVariableByKey(key);
  }

  /**
   *
   */
  notifyCoversChange(): void {
    this.scope.coverScopes.forEach((scope) => scope.available.refresh());
  }
}
