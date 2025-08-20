/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { FormMeta } from '@flowgram.ai/node';
import type { FormMetaOrFormMetaGenerator } from '@flowgram.ai/form-core';
import type { FlowNodeRegistry } from '@flowgram.ai/document';

import type { WorkflowNodeEntity, WorkflowPortEntity } from '../entities';
import type { WorkflowNodeMeta } from './workflow-node';
import type { WorkflowLinesManager } from '../workflow-lines-manager';

/**
 * 节点表单引擎配置
 */
export type WorkflowNodeFormMeta = FormMetaOrFormMetaGenerator | FormMeta;

/**
 * 节点注册
 */
export interface WorkflowNodeRegistry extends FlowNodeRegistry<WorkflowNodeMeta> {
  formMeta?: WorkflowNodeFormMeta;
  canAddLine?: (
    fromPort: WorkflowPortEntity,
    toPort: WorkflowPortEntity,
    lines: WorkflowLinesManager,
    silent?: boolean
  ) => boolean;
}

export interface WorkflowNodeRenderProps {
  node: WorkflowNodeEntity;
}
