/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowEntityHoverable } from '@flowgram.ai/free-layout-core';
import type { Entity } from '@flowgram.ai/core';

export type StackingContext = {
  hoveredEntity?: WorkflowEntityHoverable;
  hoveredEntityID?: string;
  selectedEntities: Entity[];
  selectedIDs: string[];
};
