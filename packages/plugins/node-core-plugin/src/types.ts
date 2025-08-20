/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  DecoratorExtension,
  EffectExtension,
  NodeErrorRender,
  NodePlaceholderRender,
  SetterExtension,
  ValidationExtension,
} from '@flowgram.ai/form-core';

export interface NodeEngineMaterialOptions {
  /**
   * 节点项的渲染物料
   */
  setters?: SetterExtension[];
  /**
   * 节点项的渲染装饰器物料
   */
  decorators?: DecoratorExtension[];
  /**
   * 副作用物料
   */
  effects?: EffectExtension[];
  /**
   * 校验物料
   */
  validators?: ValidationExtension[];
  /**
   * 节点内部报错的渲染组件
   */
  nodeErrorRender?: NodeErrorRender;
  /**
   * 节点无内容时的渲染组件
   */
  nodePlaceholderRender?: NodePlaceholderRender;
}
