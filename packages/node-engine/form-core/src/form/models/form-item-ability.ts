/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface FormItemAbility {
  type: string;
  /**
   * 注册到formManager时钩子时调用
   */
  onAbilityRegister?: () => void;
}

export interface AbilityClass {
  type: string;

  new (): FormItemAbility;
}
