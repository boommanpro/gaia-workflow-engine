/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeEntity, WorkflowNodeMeta } from '@flowgram.ai/free-layout-core';

export const isContainer = (node?: WorkflowNodeEntity): boolean =>
  node?.getNodeMeta<WorkflowNodeMeta>().isContainer ?? false;
