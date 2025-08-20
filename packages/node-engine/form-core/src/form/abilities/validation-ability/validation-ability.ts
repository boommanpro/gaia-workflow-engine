/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItemAbility } from '../../models/form-item-ability';

export class ValidationAbility implements FormItemAbility {
  static readonly type = 'validation';

  get type(): string {
    return ValidationAbility.type;
  }
}
