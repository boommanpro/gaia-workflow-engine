/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity } from '@flowgram.ai/document';

import type { WorkflowNodeLinesData, WorkflowNodePortsData } from '../entity-datas';

declare module '@flowgram.ai/document' {
  interface FlowNodeEntity {
    lines: WorkflowNodeLinesData;
    ports: WorkflowNodePortsData;
  }
}
export type WorkflowNodeEntity = FlowNodeEntity;
export const WorkflowNodeEntity = FlowNodeEntity;
