/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeSchema } from './node';

export interface WorkflowGroupSchema extends WorkflowNodeSchema {
  data: {
    title?: string;
    color?: string;
    parentID: string;
    blockIDs: string[];
  };
}
