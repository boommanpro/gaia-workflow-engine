/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { shallowEqual } from 'fast-equals';

import { getParentFields } from '../utils/variable-field';
import { ASTNodeJSON, ASTNodeJSONOrKind, Identifier } from '../types';
import { type BaseType } from '../type';
import { ASTNodeFlags } from '../flags';
import { type BaseExpression } from '../expression';
import { ASTNode } from '../ast-node';

/**
 * 声明类 AST 节点
 */
export type BaseVariableFieldJSON<VariableMeta = any> = {
  key?: Identifier;
  type?: ASTNodeJSONOrKind;
  initializer?: ASTNodeJSON; // 变量初始化表达式
  meta?: VariableMeta;
};

export abstract class BaseVariableField<VariableMeta = any> extends ASTNode<
  BaseVariableFieldJSON<VariableMeta>
> {
  public flags: ASTNodeFlags = ASTNodeFlags.VariableField;

  protected _type?: BaseType;

  protected _meta: VariableMeta = {} as any;

  protected _initializer?: BaseExpression;

  /**
   * 父变量字段，通过由近而远的方式进行排序
   */
  get parentFields(): BaseVariableField[] {
    return getParentFields(this);
  }

  get keyPath(): string[] {
    return [...this.parentFields.reverse().map((_field) => _field.key), this.key];
  }

  get meta(): VariableMeta {
    return this._meta;
  }

  get type(): BaseType {
    return (this._initializer?.returnType || this._type)!;
  }

  get initializer(): BaseExpression | undefined {
    return this._initializer;
  }

  get hash(): string {
    return `[${this._version}]${this.keyPath.join('.')}`;
  }

  /**
   * 解析 VariableDeclarationJSON 从而生成变量声明节点
   */
  fromJSON({ type, initializer, meta }: BaseVariableFieldJSON<VariableMeta>): void {
    // 类型变化
    this.updateType(type);

    // 表达式更新
    this.updateInitializer(initializer);

    // Extra 更新
    this.updateMeta(meta!);
  }

  updateType(type: BaseVariableFieldJSON['type']) {
    const nextTypeJson = typeof type === 'string' ? { kind: type } : type;
    this.updateChildNodeByKey('_type', nextTypeJson);
  }

  updateInitializer(nextInitializer?: BaseVariableFieldJSON['initializer']) {
    this.updateChildNodeByKey('_initializer', nextInitializer);
  }

  updateMeta(nextMeta: VariableMeta) {
    if (!shallowEqual(nextMeta, this._meta)) {
      this._meta = nextMeta;
      this.fireChange();
    }
  }

  /**
   * 根据 keyPath 去找下钻的变量字段
   * @param keyPath
   * @returns
   */
  getByKeyPath(keyPath: string[]): BaseVariableField | undefined {
    if (this.type?.flags & ASTNodeFlags.DrilldownType) {
      return this.type.getByKeyPath(keyPath) as BaseVariableField | undefined;
    }

    return undefined;
  }

  /**
   * 监听类型变化
   * @param observer
   * @returns
   */
  onTypeChange(observer: (type: ASTNode | undefined) => void) {
    return this.subscribe(observer, { selector: (curr) => curr.type });
  }

  /**
   * 转换为 JSON
   * @returns
   */
  toJSON(): BaseVariableFieldJSON<VariableMeta> & { kind: string } {
    return {
      kind: this.kind,
      key: this.key,
      type: this.type?.toJSON(),
      initializer: this.initializer?.toJSON(),
      meta: this._meta,
    };
  }
}
