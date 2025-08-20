/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind } from '../types';
import { BaseType } from './base-type';

export class NumberType extends BaseType {
  static kind: string = ASTKind.Number;

  fromJSON(): void {
    // noop
  }
}
