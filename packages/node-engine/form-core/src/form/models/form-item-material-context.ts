/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowNodeEntity } from '@flowgram.ai/document';
import { PlaygroundContext } from '@flowgram.ai/core';

import { type FormModel, IFormItemMeta } from '..';

export interface FormItemMaterialContext {
  /**
   * 当前表单项的meta
   */
  meta: IFormItemMeta;
  /**
   * 当前表单项的路径
   */
  path: string;
  /**
   * 节点引擎全局readonly
   */
  readonly: boolean;
  /**
   * 通过路径获取表单项的值
   * @param path 表单项在当前表单中的绝对路径，路径协议遵循glob
   */
  getFormItemValueByPath: <T>(path: string) => T;
  /**
   * 节点表单校验回调函数注册
   */
  onFormValidate: FormModel['onValidate'];
  /**
   * 获取Node模型
   */
  node: FlowNodeEntity;
  /**
   * 获取FormModel原始模型
   */
  form: FormModel;
  /**
   * 业务注入的全局context
   */
  playgroundContext: PlaygroundContext;
  /**
   * 数组场景下当前项的index
   */
  index?: number | undefined;
}
