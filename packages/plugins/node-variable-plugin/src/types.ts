/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  Scope,
  type ASTNodeJSON,
  type VariableDeclarationJSON,
} from '@flowgram.ai/variable-plugin';
import { Disposable } from '@flowgram.ai/utils';
import { FormItem } from '@flowgram.ai/form-core';
import { FlowNodeEntity } from '@flowgram.ai/document';

export interface VariableAbilityCommonContext {
  node: FlowNodeEntity; // 节点
  formItem?: FormItem; // 表单项 (节点引擎 V2 不存在，所以可能为空)
  scope: Scope; // 作用域
  options: VariableAbilityOptions;
}

export interface VariableAbilityInitCtx extends VariableAbilityCommonContext {}

export interface VariableAbilityOptions {
  // 变量提供能力可复用
  key?: string;
  // 输出的变量为私有作用域的变量
  private?: boolean;
  // 生成 AST 在抽象语法树中的索引，默认用 formItem 的 Path 作为 namespace
  namespace?: string;
  // 输出变量的作用域类型，默认为 public
  scope?: 'private' | 'public';
  // 初始化，可以进行额外的操作监听
  onInit?: (ctx: VariableAbilityInitCtx) => Disposable | undefined;
  // Hack: 老表单引擎使用 Hack 字段，在 FormItem 移除时不移除变量 AST，用于老表单部分复杂联动场景
  disableRemoveASTWhenFormItemDispose?: boolean;
  // 扩展字段，可以在 ability onInit 时进行一些额外操作
  [key: string]: any;
}

export interface VariableAbilityParseContext extends VariableAbilityCommonContext {}

export interface VariableProviderAbilityOptions<V = any> extends VariableAbilityOptions {
  // 解析变量协议
  parse: (v: V, ctx: VariableAbilityParseContext) => VariableDeclarationJSON[];
}

export interface VariableConsumerAbilityOptions<V = any> extends VariableAbilityOptions {
  // 解析变量协议
  parse: (v: V, ctx: VariableAbilityParseContext) => ASTNodeJSON | undefined;
}
