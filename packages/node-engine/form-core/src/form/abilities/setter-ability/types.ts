/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { FormItemContext, FormItemFeedback } from '../../types';
import { type FormItemMaterialContext } from '../../models/form-item-material-context';
import { ValidatorFunction } from '../../abilities/validation-ability';

export interface SetterAbilityOptions {
  /**
   * 已注册的setter的唯一标识
   */
  key: string;
}

/**
 * Setter context 是 FormItemMaterialContext 的外观
 * 基于外观设计模式设计，屏蔽了FormItemMaterialContext中一些setter不可见的接口
 * readonly: 对于setter 已经放在props 根级别，所以在这里屏蔽，防止干扰
 * getFormItemValueByPath: setter需通过表单联动方式获取其他表单项的值，不推荐是用这个方法，所以屏蔽
 */
export type SetterOrDecoratorContext = Omit<
  FormItemMaterialContext,
  'getFormItemValueByPath' | 'readonly'
>;

export interface SetterComponentProps<T = any, CustomOptions = any>
  extends FormItemFeedback,
    FormItemContext {
  value: T;
  onChange: (v: T) => void;
  /**
   * 节点引擎全局readonly
   */
  readonly: boolean;
  children?: any;
  options: SetterAbilityOptions & CustomOptions;
  context: SetterOrDecoratorContext;
}

export interface SetterExtension {
  key: string;
  component: (props: SetterComponentProps) => any;
  validator?: ValidatorFunction;
}

export type SetterHoc = (
  Component: React.JSXElementConstructor<SetterComponentProps>
) => React.JSXElementConstructor<SetterComponentProps>;
