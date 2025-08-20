/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService } from '@flowgram.ai/core';

import { WorkflowDocument } from '../workflow-document';

export function useWorkflowDocument(): WorkflowDocument {
  return useService<WorkflowDocument>(WorkflowDocument);
}
