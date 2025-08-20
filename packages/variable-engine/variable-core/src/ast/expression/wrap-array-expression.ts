/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { postConstructAST } from '../utils/inversify';
import { ASTKind, ASTNodeJSON } from '../types';
import { BaseType } from '../type';
import { BaseExpression } from './base-expression';

export interface WrapArrayExpressionJSON {
  wrapFor: ASTNodeJSON; // 需要被遍历的表达式类型
}

/**
 * 遍历表达式，对列表进行遍历，获取遍历后的变量类型
 */
export class WrapArrayExpression extends BaseExpression<WrapArrayExpressionJSON> {
  static kind: string = ASTKind.WrapArrayExpression;

  protected _wrapFor: BaseExpression | undefined;

  protected _returnType: BaseType | undefined;

  get wrapFor() {
    return this._wrapFor;
  }

  get returnType(): BaseType | undefined {
    return this._returnType;
  }

  refreshReturnType() {
    // 被遍历表达式的返回值
    const childReturnTypeJSON = this.wrapFor?.returnType?.toJSON();

    this.updateChildNodeByKey('_returnType', {
      kind: ASTKind.Array,
      items: childReturnTypeJSON,
    });
  }

  getRefFields(): [] {
    return [];
  }

  fromJSON({ wrapFor: expression }: WrapArrayExpressionJSON): void {
    this.updateChildNodeByKey('_wrapFor', expression);
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.WrapArrayExpression,
      wrapFor: this.wrapFor?.toJSON(),
    };
  }

  @postConstructAST()
  protected init() {
    this.refreshReturnType = this.refreshReturnType.bind(this);

    this.toDispose.push(
      this.subscribe(this.refreshReturnType, {
        selector: (curr) => curr.wrapFor?.returnType,
        triggerOnInit: true,
      })
    );
  }
}
