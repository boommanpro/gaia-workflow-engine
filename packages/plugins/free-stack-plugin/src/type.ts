/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';

export interface StackingContext {
  hoveredEntityID?: string;
  selectedNodes: WorkflowNodeEntity[];
  selectedIDs: Set<string>;
  sortNodes: (nodes: WorkflowNodeEntity[]) => WorkflowNodeEntity[];
}

export interface StackContextManagerOptions {
  sortNodes: (nodes: WorkflowNodeEntity[]) => WorkflowNodeEntity[];
}

export type FreeStackPluginOptions = Partial<StackContextManagerOptions>;
