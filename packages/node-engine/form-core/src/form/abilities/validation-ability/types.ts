/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItemMaterialContext } from '../../models';

// 这里参照了rehaje 的validator function 返回格式
export interface IValidateResult {
  type: 'error' | 'warning';
  message: string;
}

export type ValidatorFunctionResponse =
  | null
  | void
  | undefined
  | string
  | boolean
  | IValidateResult;

export interface ValidationAbilityOptions {
  /**
   * 已注册的validator唯一标识
   */
  key?: string;
  /**
   * 不使用已注册的validator 也支持在options中直接写validator
   */
  validator?: ValidatorFunction;
}

export interface ValidatorProps<T = any, CustomOptions = any> {
  value: T;
  options: ValidationAbilityOptions & CustomOptions;
  context: FormItemMaterialContext;
}

export type ValidatorFunction = (props: ValidatorProps) => ValidatorFunctionResponse;

export interface ValidationExtension {
  key: string;
  validator: ValidatorFunction;
}
