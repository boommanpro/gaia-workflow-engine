/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { shallowEqual } from 'fast-equals';

import { checkRefCycle } from '../utils/expression';
import { ASTNodeJSON, ASTKind, CreateASTParams } from '../types';
import { BaseType } from '../type';
import { type BaseVariableField } from '../declaration';
import { subsToDisposable } from '../../utils/toDisposable';
import { BaseExpression } from './base-expression';

interface KeyPathExpressionJSON {
  keyPath: string[];
}

/**
 * 新版 KeyPathExpressionV2，相比旧版：
 * - returnType 拷贝新一份，避免引用问题
 * - 引入成环检测
 */
export class KeyPathExpressionV2<
  CustomPathJSON extends ASTNodeJSON = KeyPathExpressionJSON,
> extends BaseExpression<CustomPathJSON> {
  static kind: string = ASTKind.KeyPathExpression;

  protected _keyPath: string[] = [];

  get keyPath(): string[] {
    return this._keyPath;
  }

  getRefFields(): BaseVariableField[] {
    const ref = this.scope.available.getByKeyPath(this._keyPath);

    // 刷新引用时，检测循环引用，如果存在循环引用则不引用该变量
    if (checkRefCycle(this, [ref])) {
      // 提示存在循环引用
      console.warn(
        '[CustomKeyPathExpression] checkRefCycle: Reference Cycle Existed',
        this.parentFields.map(_field => _field.key).reverse(),
      );
      return [];
    }

    return ref ? [ref] : [];
  }

  // 直接生成新的 returnType 节点而不是直接复用
  // 确保不同的 keyPath 不指向同一个 Field
  _returnType: BaseType;

  get returnType() {
    return this._returnType;
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

  getReturnTypeJSONByRef(_ref: BaseVariableField | undefined): ASTNodeJSON | undefined {
    return _ref?.type?.toJSON();
  }

  protected prevRefTypeHash: string | undefined;

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
      subsToDisposable(
        this.refs$.subscribe(_type => {
          const [ref] = this._refs;

          if (this.prevRefTypeHash !== ref?.type?.hash) {
            this.prevRefTypeHash = ref?.type?.hash;
            this.updateChildNodeByKey('_returnType', this.getReturnTypeJSONByRef(ref));
          }
        }),
      ),
    ]);
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.KeyPathExpression,
      keyPath: this._keyPath,
    };
  }
}
