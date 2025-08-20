/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  type Observable,
  distinctUntilChanged,
  map,
  switchMap,
  combineLatest,
  of,
  Subject,
  share,
} from 'rxjs';
import { shallowEqual } from 'fast-equals';

import { getParentFields } from '../utils/variable-field';
import { ASTNodeJSON, type CreateASTParams } from '../types';
import { type BaseType } from '../type';
import { ASTNodeFlags } from '../flags';
import { type BaseVariableField } from '../declaration';
import { ASTNode } from '../ast-node';
import { subsToDisposable } from '../../utils/toDisposable';
import { IVariableTable } from '../../scope/types';

type ExpressionRefs = (BaseVariableField | undefined)[];

export abstract class BaseExpression<
  JSON extends ASTNodeJSON = any,
  InjectOpts = any
> extends ASTNode<JSON, InjectOpts> {
  public flags: ASTNodeFlags = ASTNodeFlags.Expression;

  /**
   * 获取全局变量表，方便表达式获取引用变量
   */
  get globalVariableTable(): IVariableTable {
    return this.scope.variableEngine.globalVariableTable;
  }

  /**
   * 父变量字段，通过由近而远的方式进行排序
   */
  get parentFields(): BaseVariableField[] {
    return getParentFields(this);
  }

  /**
   * 获取表达式引用的变量字段
   * - 通常是 变量 VariableDeclaration，或者 属性 Property 节点
   */
  abstract getRefFields(): ExpressionRefs;

  /**
   * 表达式返回的数据类型
   */
  abstract returnType: BaseType | undefined;

  /**
   * 引用变量
   */
  protected _refs: ExpressionRefs = [];

  get refs(): ExpressionRefs {
    return this._refs;
  }

  protected refreshRefs$: Subject<void> = new Subject();

  /**
   * 刷新变量引用
   */
  refreshRefs() {
    this.refreshRefs$.next();
  }

  /**
   * 监听引用变量变化
   * 监听 [a.b.c] -> [a.b]
   */
  refs$: Observable<ExpressionRefs> = this.refreshRefs$.pipe(
    map(() => this.getRefFields()),
    distinctUntilChanged<ExpressionRefs>(shallowEqual),
    switchMap((refs) =>
      !refs?.length
        ? of([])
        : combineLatest(
            refs.map((ref) =>
              ref
                ? (ref.value$ as unknown as Observable<BaseVariableField | undefined>)
                : of(undefined)
            )
          )
    ),
    share()
  );

  constructor(params: CreateASTParams, opts?: InjectOpts) {
    super(params, opts);

    this.toDispose.push(
      subsToDisposable(
        this.refs$.subscribe((_refs: ExpressionRefs) => {
          this._refs = _refs;
          this.fireChange();
        })
      )
    );
  }
}
