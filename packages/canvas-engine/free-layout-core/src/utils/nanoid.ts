/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid as nanoidOrigin } from 'nanoid';

export function nanoid(n?: number): string {
  return nanoidOrigin(n);
}
