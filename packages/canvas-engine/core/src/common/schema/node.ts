/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type TransformSchema } from './transform-schema';

export interface NodeSchema {
  id: string;
  name?: string;
}

export interface TransformNodeSchema extends NodeSchema {
  transform: TransformSchema;
}
