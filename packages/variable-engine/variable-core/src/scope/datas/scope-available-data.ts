/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  Observable,
  Subject,
  animationFrameScheduler,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  share,
  skip,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { flatten } from 'lodash';
import { shallowEqual } from 'fast-equals';
import { Disposable } from '@flowgram.ai/utils';
import { Emitter } from '@flowgram.ai/utils';

import { IVariableTable } from '../types';
import { type Scope } from '../scope';
import { subsToDisposable } from '../../utils/toDisposable';
import { createMemo } from '../../utils/memo';
import { SubscribeConfig } from '../../ast/types';
import { ASTNode, BaseVariableField, VariableDeclaration } from '../../ast';
/**
 * 作用域可用变量
 */
export class ScopeAvailableData {
  protected memo = createMemo();

  get globalVariableTable(): IVariableTable {
    return this.scope.variableEngine.globalVariableTable;
  }

  protected _version: number = 0;

  protected refresh$: Subject<void> = new Subject();

  protected _variables: VariableDeclaration[] = [];

  get version() {
    return this._version;
  }

  protected bumpVersion() {
    this._version = this._version + 1;
    if (this._version === Number.MAX_SAFE_INTEGER) {
      this._version = 0;
    }
  }

  // 刷新可访问变量列表
  refresh(): void {
    // 销毁的作用域不用触发 refresh
    if (this.scope.disposed) {
      return;
    }
    this.refresh$.next();
  }

  /**
   * 监听
   */
  protected variables$: Observable<VariableDeclaration[]> = this.refresh$.pipe(
    // 输出变量是否 version 发生变化
    map(() => flatten(this.depScopes.map((scope) => scope.output.variables || []))),
    // 变量列表浅比较
    distinctUntilChanged<VariableDeclaration[]>(shallowEqual),
    share()
  );

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
   * @deprecated
   */
  protected onDataChangeEmitter = new Emitter<VariableDeclaration[]>();

  protected onListOrAnyVarChangeEmitter = new Emitter<VariableDeclaration[]>();

  /**
   * @deprecated use available.onListOrAnyVarChange instead
   */
  public onDataChange = this.onDataChangeEmitter.event;

  /**
   * listen to variable list change + any variable drilldown change
   */
  public onListOrAnyVarChange = this.onListOrAnyVarChangeEmitter.event;

  constructor(public readonly scope: Scope) {
    this.scope.toDispose.pushAll([
      this.onVariableListChange((_variables) => {
        this._variables = _variables;
        this.memo.clear();
        this.onDataChangeEmitter.fire(this._variables);
        this.bumpVersion();
        this.onListOrAnyVarChangeEmitter.fire(this._variables);
      }),
      this.onAnyVariableChange(() => {
        this.onDataChangeEmitter.fire(this._variables);
        this.bumpVersion();
        this.onListOrAnyVarChangeEmitter.fire(this._variables);
      }),
      Disposable.create(() => {
        this.refresh$.complete();
        this.refresh$.unsubscribe();
      }),
    ]);
  }

  /**
   * 获取可消费变量
   */
  get variables(): VariableDeclaration[] {
    return this._variables;
  }

  /**
   * 获取可访问的变量 keys
   */
  get variableKeys(): string[] {
    return this.memo('availableKeys', () => this._variables.map((_v) => _v.key));
  }

  /**
   * 返回依赖的作用域
   */
  get depScopes(): Scope[] {
    return this.scope.depScopes;
  }

  /**
   * 通过 keyPath 找到可用变量
   * @param keyPath
   * @returns
   */
  getByKeyPath(keyPath: string[] = []): BaseVariableField | undefined {
    // 检查变量是否在可访问范围内
    if (!this.variableKeys.includes(keyPath[0])) {
      return;
    }
    return this.globalVariableTable.getByKeyPath(keyPath);
  }

  /**
   * Track Variable Change (Includes type update and children update) By KeyPath
   * @returns
   */
  trackByKeyPath<Data = BaseVariableField | undefined>(
    keyPath: string[] = [],
    cb: (variable?: Data) => void,
    opts?: SubscribeConfig<BaseVariableField | undefined, Data>
  ): Disposable {
    const { triggerOnInit = true, debounceAnimation, selector } = opts || {};

    return subsToDisposable(
      merge(this.anyVariableChange$, this.variables$)
        .pipe(
          triggerOnInit ? startWith() : tap(() => null),
          map(() => {
            const v = this.getByKeyPath(keyPath);
            return selector ? selector(v) : (v as any);
          }),
          distinctUntilChanged(
            (a, b) => shallowEqual(a, b),
            (value) => {
              if (value instanceof ASTNode) {
                // 如果 value 是 ASTNode，则进行 hash 的比较
                return value.hash;
              }
              return value;
            }
          ),
          // 每个 animationFrame 内所有更新合并成一个
          debounceAnimation ? debounceTime(0, animationFrameScheduler) : tap(() => null)
        )
        .subscribe(cb)
    );
  }
}
