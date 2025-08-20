/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Observable, Subject, merge, share, skip, switchMap } from 'rxjs';
import { DisposableCollection, Emitter } from '@flowgram.ai/utils';

import { subsToDisposable } from '../utils/toDisposable';
import { BaseVariableField } from '../ast/declaration/base-variable-field';
import { VariableDeclaration } from '../ast';
import { IVariableTable } from './types';

export class VariableTable implements IVariableTable {
  protected table: Map<string, VariableDeclaration> = new Map();

  toDispose = new DisposableCollection();

  /**
   * @deprecated
   */
  protected onDataChangeEmitter = new Emitter<void>();

  protected variables$: Subject<VariableDeclaration[]> = new Subject<VariableDeclaration[]>();

  // 监听变量列表中的单个变量变化
  protected anyVariableChange$: Observable<VariableDeclaration> = this.variables$.pipe(
    switchMap((_variables) =>
      merge(
        ..._variables.map((_v) =>
          _v.value$.pipe<any>(
            // 跳过 BehaviorSubject 第一个
            skip(1)
          )
        )
      )
    ),
    share()
  );

  /**
   * listen to any variable update in list
   * @param observer
   * @returns
   */
  onAnyVariableChange(observer: (changedVariable: VariableDeclaration) => void) {
    return subsToDisposable(this.anyVariableChange$.subscribe(observer));
  }

  /**
   * listen to variable list change
   * @param observer
   * @returns
   */
  onVariableListChange(observer: (variables: VariableDeclaration[]) => void) {
    return subsToDisposable(this.variables$.subscribe(observer));
  }

  /**
   * listen to variable list change + any variable update in list
   * @param observer
   */
  onListOrAnyVarChange(observer: () => void) {
    const disposables = new DisposableCollection();
    disposables.pushAll([this.onVariableListChange(observer), this.onAnyVariableChange(observer)]);
    return disposables;
  }

  /**
   * @deprecated use onListOrAnyVarChange instead
   */
  public onDataChange = this.onDataChangeEmitter.event;

  protected _version: number = 0;

  fireChange() {
    this.bumpVersion();
    this.onDataChangeEmitter.fire();
    this.variables$.next(this.variables);
    this.parentTable?.fireChange();
  }

  get version(): number {
    return this._version;
  }

  protected bumpVersion() {
    this._version = this._version + 1;
    if (this._version === Number.MAX_SAFE_INTEGER) {
      this._version = 0;
    }
  }

  constructor(
    public parentTable?: IVariableTable // 父变量表，会包含所有子表的变量
  ) {
    this.toDispose.pushAll([
      this.onDataChangeEmitter,
      // active share()
      this.onAnyVariableChange(() => {
        this.bumpVersion();
      }),
    ]);
  }

  get variables(): VariableDeclaration[] {
    return Array.from(this.table.values());
  }

  get variableKeys(): string[] {
    return Array.from(this.table.keys());
  }

  /**
   * 根据 keyPath 找到对应的变量，或 Property 节点
   * @param keyPath
   * @returns
   */
  getByKeyPath(keyPath: string[]): BaseVariableField | undefined {
    const [variableKey, ...propertyKeys] = keyPath || [];

    if (!variableKey) {
      return;
    }

    const variable = this.getVariableByKey(variableKey);

    return propertyKeys.length ? variable?.getByKeyPath(propertyKeys) : variable;
  }

  /**
   * 根据 key 值找到相应的变量
   * @param key
   * @returns
   */
  getVariableByKey(key: string) {
    return this.table.get(key);
  }

  /**
   * 往 variableTable 添加输出变量
   * @param variable
   */
  addVariableToTable(variable: VariableDeclaration) {
    this.table.set(variable.key, variable);
    if (this.parentTable) {
      (this.parentTable as VariableTable).addVariableToTable(variable);
    }
  }

  /**
   * 从 variableTable 中移除变量
   * @param key
   */
  removeVariableFromTable(key: string) {
    this.table.delete(key);
    if (this.parentTable) {
      (this.parentTable as VariableTable).removeVariableFromTable(key);
    }
  }

  dispose(): void {
    this.variableKeys.forEach((_key) =>
      (this.parentTable as VariableTable)?.removeVariableFromTable(_key)
    );
    this.parentTable?.fireChange();
    this.variables$.complete();
    this.variables$.unsubscribe();
    this.toDispose.dispose();
  }
}
