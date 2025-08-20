/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind, ASTNodeJSON } from '../types';
import { ArrayType } from '../type/array';
import { BaseType } from '../type';
import { BaseExpression } from './base-expression';

export interface EnumerateExpressionJSON {
  enumerateFor: ASTNodeJSON; // 需要被遍历的表达式类型
}

/**
 * 遍历表达式，对列表进行遍历，获取遍历后的变量类型
 */
export class EnumerateExpression extends BaseExpression<EnumerateExpressionJSON> {
  static kind: string = ASTKind.EnumerateExpression;

  protected _enumerateFor: BaseExpression | undefined;

  get enumerateFor() {
    return this._enumerateFor;
  }

  get returnType(): BaseType | undefined {
    // 被遍历表达式的返回值
    const childReturnType = this.enumerateFor?.returnType;

    if (childReturnType?.kind === ASTKind.Array) {
      // 获取 Array 的 Item 类型
      return (childReturnType as ArrayType).items;
    }

    return undefined;
  }

  getRefFields(): [] {
    return [];
  }

  fromJSON({ enumerateFor: expression }: EnumerateExpressionJSON): void {
    this.updateChildNodeByKey('_enumerateFor', expression);
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.EnumerateExpression,
      enumerateFor: this.enumerateFor?.toJSON(),
    };
  }
}
