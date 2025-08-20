/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FormManager } from './services/form-manager';

export const FormContribution = Symbol('FormContribution');

export interface FormContribution {
  onRegister?(formManager: FormManager): void;
}
