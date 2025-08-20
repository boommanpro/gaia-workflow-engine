/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MaybePromise } from '@flowgram.ai/utils';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { PlaygroundContext, PluginContext } from '@flowgram.ai/core';

import { type FormItemAbilityMeta } from './form-ability.types';

export type FormDataTypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type FormDataType =
  | string //
  | number
  | boolean
  | FormDataObject
  | DataArray
  | null;

export interface FormDataObject {
  [key: string]: FormDataType;
}

export type DataArray = Array<FormDataType>;

export const FORM_VOID = 'form-void' as const;

export interface TreeNode<T> {
  name: string;
  children?: TreeNode<T>[];
}

export interface IFormItemMeta extends TreeNode<IFormItemMeta> {
  /**
   * 表单项名称
   */
  name: string;
  /**
   * 数据类型
   */
  type: FormDataTypeName | typeof FORM_VOID;
  /**
   * 枚举值
   */
  enum?: FormDataType[];
  /**
   * 数组类型item的数据类型描述
   */
  items?: IFormItemMeta;
  /**
   * 表单项标题
   */
  title?: string;
  /**
   * 表单项描述
   */
  description?: string;
  /**
   * 表单项默认值
   */
  default?: FormDataType;
  /**
   * 是否必填
   */
  required?: boolean;
  /**
   * 扩展能力
   */
  abilities?: FormItemAbilityMeta[];

  /**
   * 子表单项
   */
  children?: IFormItemMeta[];
}

export interface IFormMeta {
  /**
   * 表单树结构root
   */
  root?: IFormItemMeta;
  /**
   * 表单全局配置
   */
  options?: IFormMetaOptions;
}

export interface NodeFormContext {
  node: FlowNodeEntity;
  playgroundContext: PlaygroundContext;
  clientContext: PluginContext & Record<string, any>;
}

export interface IFormMetaOptions {
  formatOnInit?: (value: any, context: NodeFormContext) => any;

  formatOnSubmit?: (value: any, context: NodeFormContext) => any;

  [key: string]: any;
}

export interface FormMetaGeneratorParams<PlaygroundContext, FormValue = any> {
  node: FlowNodeEntity;
  playgroundContext: PlaygroundContext;
  initialValue?: FormValue;
}

export type FormMetaGenerator<PlaygroundContext = any, FormValue = any> = (
  params: FormMetaGeneratorParams<FormValue, FormValue>
) => MaybePromise<IFormMeta>;

export type FormMetaOrFormMetaGenerator = FormMetaGenerator | IFormMeta;
