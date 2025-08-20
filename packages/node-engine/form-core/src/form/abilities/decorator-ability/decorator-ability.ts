/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormItemAbility } from '../../models/form-item-ability';

export class DecoratorAbility implements FormItemAbility {
  static readonly type = 'decorator';

  get type(): string {
    return DecoratorAbility.type;
  }
}
