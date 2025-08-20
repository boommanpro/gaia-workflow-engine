/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type Observer } from 'rxjs';

import { type Scope } from '../scope';
import { type ASTNode } from './ast-node';

export type ASTKindType = string;
export type Identifier = string;

export interface ASTNodeJSON {
  kind?: ASTKindType;
  key?: Identifier; // 没有传入时，节点会默认生成一个 key 值
  [key: string]: any;
}

/**
 * 核心 AST 节点类型
 */
export enum ASTKind {
  /**
   * 类型相关
   * - 内部默认实现一套基于 JSON 类型的类型 AST 节点
   */
  String = 'String', // 字符串
  Number = 'Number', // 数字
  Integer = 'Integer', // 整数
  Boolean = 'Boolean', // 布尔值
  Object = 'Object', // Object
  Array = 'Array', // Array
  Map = 'Map', // Map
  Union = 'Union', // 联合类型，常用于类型判断，一般不对业务透出
  Any = 'Any', // 任意类型，常用于业务判断
  CustomType = 'CustomType', // 自定义类型，用于业务自定义类型

  /**
   * 声明
   */
  Property = 'Property', // Object 下钻的字段定义
  VariableDeclaration = 'VariableDeclaration', // 变量声明
  VariableDeclarationList = 'VariableDeclarationList', // 变量声明

  /**
   * 表达式
   */
  KeyPathExpression = 'KeyPathExpression', // 通过路径系统访问变量上的字段
  EnumerateExpression = 'EnumerateExpression', // 对指定的数据进行遍历
  WrapArrayExpression = 'WrapArrayExpression', // Wrap with Array Type

  /**
   * 通用 AST 节点
   */
  ListNode = 'ListNode', // 通用 List<ASTNode> 存储节点
  DataNode = 'DataNode', // 通用的数据存储节点
  MapNode = 'MapNode', // 通用 Map<string, ASTNode> 存储节点
}

export interface CreateASTParams {
  scope: Scope;
  key?: Identifier;
  parent?: ASTNode;
}

export type ASTNodeJSONOrKind = string | ASTNodeJSON;

export type ObserverOrNext<T> = Partial<Observer<T>> | ((value: T) => void);

export interface SubscribeConfig<This, Data> {
  // 将一个 animationFrame 内的所有变更合并成一个
  debounceAnimation?: boolean;
  // 订阅时默认响应一次值
  triggerOnInit?: boolean;
  selector?: (curr: This) => Data;
}

export type GetKindJSON<KindType extends string, JSON extends ASTNodeJSON> = {
  kind: KindType;
  key?: Identifier;
} & JSON;

export type GetKindJSONOrKind<KindType extends string, JSON extends ASTNodeJSON> =
  | ({
      kind: KindType;
      key?: Identifier;
    } & JSON)
  | KindType;

export interface GlobalEventActionType<
  Type = string,
  Payload = any,
  AST extends ASTNode = ASTNode
> {
  type: Type;
  payload?: Payload;
  ast?: AST;
}

export type NewASTAction = GlobalEventActionType<'NewAST'>;
export type UpdateASTAction = GlobalEventActionType<'UpdateAST'>;
export type DisposeASTAction = GlobalEventActionType<'DisposeAST'>;
