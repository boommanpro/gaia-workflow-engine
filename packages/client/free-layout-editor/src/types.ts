/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowJSON, WorkflowOperationBaseService } from '@flowgram.ai/free-layout-core';

export interface WorkflowOperationService extends WorkflowOperationBaseService {
  /**
   * 开始事务
   */
  startTransaction(): void;
  /**
   * 结束事务
   */
  endTransaction(): void;

  fromJSON(json: WorkflowJSON): void;
}

export const WorkflowOperationService = Symbol('WorkflowOperationService');
