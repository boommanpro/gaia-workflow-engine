/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind, GlobalEventActionType, type CreateASTParams } from '../types';
import { ASTNode } from '../ast-node';
import { BaseVariableField, BaseVariableFieldJSON } from './base-variable-field';

/**
 * 声明类 AST 节点
 */
export type VariableDeclarationJSON<VariableMeta = any> = BaseVariableFieldJSON<VariableMeta> & {
  order?: number; // 变量排序
};

export type ReSortVariableDeclarationsAction = GlobalEventActionType<'ReSortVariableDeclarations'>;

export class VariableDeclaration<VariableMeta = any> extends BaseVariableField<VariableMeta> {
  static kind: string = ASTKind.VariableDeclaration;

  protected _order: number = 0;

  get order(): number {
    return this._order;
  }

  constructor(params: CreateASTParams) {
    super(params);
  }

  /**
   * 解析 VariableDeclarationJSON 从而生成变量声明节点
   */
  fromJSON({ order, ...rest }: VariableDeclarationJSON<VariableMeta>): void {
    // 更新排序
    this.updateOrder(order);

    // 更新其他信息
    super.fromJSON(rest as BaseVariableFieldJSON<VariableMeta>);
  }

  updateOrder(order: number = 0): void {
    if (order !== this._order) {
      this._order = order;
      this.dispatchGlobalEvent<ReSortVariableDeclarationsAction>({
        type: 'ReSortVariableDeclarations',
      });
      this.fireChange();
    }
  }

  // 监听类型变化
  onTypeChange(observer: (type: ASTNode | undefined) => void) {
    return this.subscribe(observer, { selector: (curr) => curr.type });
  }
}
