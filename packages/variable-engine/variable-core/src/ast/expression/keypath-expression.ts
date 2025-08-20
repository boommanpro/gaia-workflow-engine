/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { shallowEqual } from 'fast-equals';

import { ASTNodeJSON, ASTKind, CreateASTParams } from '../types';
import { BaseType } from '../type';
import { ASTNodeFlags } from '../flags';
import { type BaseVariableField } from '../declaration';
import { BaseExpression } from './base-expression';

export interface KeyPathExpressionJSON {
  keyPath: string[];
}

export class KeyPathExpression<
  CustomPathJSON extends ASTNodeJSON = KeyPathExpressionJSON,
> extends BaseExpression<CustomPathJSON> {
  static kind: string = ASTKind.KeyPathExpression;

  protected _keyPath: string[] = [];

  get keyPath(): string[] {
    return this._keyPath;
  }

  getRefFields(): BaseVariableField[] {
    const ref = this.scope.available.getByKeyPath(this._keyPath);
    return ref ? [ref] : [];
  }

  get returnType(): BaseType | undefined {
    const [refNode] = this._refs || [];

    // 获取引用变量的类型
    if (refNode && refNode.flags & ASTNodeFlags.VariableField) {
      return refNode.type;
    }

    return;
  }

  /**
   * 业务重改该方法可快速定制自己的 Path 表达式
   * - 只需要将业务的 Path 解析为变量系统的 KeyPath 即可
   * @param json 业务定义的 Path 表达式
   * @returns
   */
  protected parseToKeyPath(json: CustomPathJSON): string[] {
    // 默认 JSON 为 KeyPathExpressionJSON 格式
    return (json as unknown as KeyPathExpressionJSON).keyPath;
  }

  fromJSON(json: CustomPathJSON): void {
    const keyPath = this.parseToKeyPath(json);

    if (!shallowEqual(keyPath, this._keyPath)) {
      this._keyPath = keyPath;

      // keyPath 更新后，需刷新引用变量
      this.refreshRefs();
    }
  }

  constructor(params: CreateASTParams, opts: any) {
    super(params, opts);

    this.toDispose.pushAll([
      // 可以用变量列表变化时候 (有新增或者删除时)
      this.scope.available.onVariableListChange(() => {
        this.refreshRefs();
      }),
      // this._keyPath 指向的可引用变量发生变化时，刷新引用数据
      this.scope.available.onAnyVariableChange(_v => {
        if (_v.key === this._keyPath[0]) {
          this.refreshRefs();
        }
      }),
    ]);
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.KeyPathExpression,
      keyPath: this._keyPath,
    };
  }
}
