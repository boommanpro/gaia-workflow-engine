/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind } from './types';
import {
  type StringType,
  type NumberType,
  type BooleanType,
  type IntegerType,
  type ObjectType,
  type ArrayType,
  type MapType,
  type CustomType,
} from './type';
import { type EnumerateExpression, type KeyPathExpression } from './expression';
import {
  type Property,
  type VariableDeclaration,
  type VariableDeclarationList,
} from './declaration';
import { type ASTNode } from './ast-node';

export namespace ASTMatch {
  /**
   * 类型相关
   * @returns
   */
  export const isString = (node?: ASTNode): node is StringType => node?.kind === ASTKind.String;

  export const isNumber = (node?: ASTNode): node is NumberType => node?.kind === ASTKind.Number;

  export const isBoolean = (node?: ASTNode): node is BooleanType => node?.kind === ASTKind.Boolean;

  export const isInteger = (node?: ASTNode): node is IntegerType => node?.kind === ASTKind.Integer;

  export const isObject = (node?: ASTNode): node is ObjectType => node?.kind === ASTKind.Object;

  export const isArray = (node?: ASTNode): node is ArrayType => node?.kind === ASTKind.Array;

  export const isMap = (node?: ASTNode): node is MapType => node?.kind === ASTKind.Map;

  export const isCustomType = (node?: ASTNode): node is CustomType =>
    node?.kind === ASTKind.CustomType;

  /**
   * 声明相关
   */
  export const isVariableDeclaration = <VariableMeta = any>(
    node?: ASTNode
  ): node is VariableDeclaration<VariableMeta> => node?.kind === ASTKind.VariableDeclaration;

  export const isProperty = <VariableMeta = any>(node?: ASTNode): node is Property<VariableMeta> =>
    node?.kind === ASTKind.Property;

  export const isVariableDeclarationList = (node?: ASTNode): node is VariableDeclarationList =>
    node?.kind === ASTKind.VariableDeclarationList;

  /**
   * 表达式相关
   */
  export const isEnumerateExpression = (node?: ASTNode): node is EnumerateExpression =>
    node?.kind === ASTKind.EnumerateExpression;

  export const isKeyPathExpression = (node?: ASTNode): node is KeyPathExpression =>
    node?.kind === ASTKind.KeyPathExpression;

  /**
   * Check AST Match by ASTClass
   */
  export function is<TargetASTNode extends ASTNode>(
    node?: ASTNode,
    targetType?: { kind: string; new (...args: any[]): TargetASTNode }
  ): node is TargetASTNode {
    return node?.kind === targetType?.kind;
  }
}
