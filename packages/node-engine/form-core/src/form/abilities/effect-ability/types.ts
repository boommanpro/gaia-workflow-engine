/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItemContext, FormItemEventName } from '../../types';
import { type FormItemMaterialContext } from '../../models/form-item-material-context';

export interface EffectAbilityOptions {
  /**
   * 已注册的effect 唯一标识
   */
  key?: string;
  /**
   * 触发 effect 的事件
   */
  event?: FormItemEventName;
  /**
   * 如果不使用已经注册的effect, 也支持直接写effect函数
   */
  effect?: EffectFunction;
}

export interface EffectEvent {
  target: any & { value: any };
  currentTarget: any;
  type: FormItemEventName;
}

export interface EffectProps<CustomOptions = any, Event = EffectEvent> extends FormItemContext {
  event: Event;
  options: EffectAbilityOptions & CustomOptions;
  context: FormItemMaterialContext;
}

export type EffectFunction = (props: EffectProps) => void;

export interface EffectExtension {
  key: string;
  effect: EffectFunction;
}
