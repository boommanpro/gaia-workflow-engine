/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEntityFromContext } from '@flowgram.ai/core';

import { type WorkflowNodeEntity } from '../entities';

/**
 * 获取当前节点
 */
export function useCurrentEntity(): WorkflowNodeEntity {
  return useEntityFromContext<WorkflowNodeEntity>();
}
