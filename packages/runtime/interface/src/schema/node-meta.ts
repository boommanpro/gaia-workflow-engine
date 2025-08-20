/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PositionSchema } from './xy';

export interface WorkflowNodeMetaSchema {
  position: PositionSchema;
  canvasPosition?: PositionSchema;
}
