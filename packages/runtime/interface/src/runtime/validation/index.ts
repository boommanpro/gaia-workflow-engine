/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { InvokeParams } from '@runtime/base';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface IValidation {
  invoke(params: InvokeParams): ValidationResult;
}

export const IValidation = Symbol.for('Validation');
