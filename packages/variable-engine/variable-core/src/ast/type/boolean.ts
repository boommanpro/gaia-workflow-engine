/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind } from '../types';
import { BaseType } from './base-type';

export class BooleanType extends BaseType {
  static kind: string = ASTKind.Boolean;

  fromJSON(): void {
    // noop
  }
}
