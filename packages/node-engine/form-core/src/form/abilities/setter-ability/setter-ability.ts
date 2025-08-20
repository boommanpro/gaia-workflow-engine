/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItemAbility } from '../../models/form-item-ability';

export class SetterAbility implements FormItemAbility {
  static readonly type = 'setter';

  get type(): string {
    return SetterAbility.type;
  }
}
