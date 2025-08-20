/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItemContext, FormItemMaterialContext } from '../..';

export interface GetDefaultValueProps extends FormItemContext {
  options: DefaultAbilityOptions;
  context: FormItemMaterialContext;
}

export interface DefaultAbilityOptions<T = any> {
  getDefaultValue: (params: GetDefaultValueProps) => T;
}
