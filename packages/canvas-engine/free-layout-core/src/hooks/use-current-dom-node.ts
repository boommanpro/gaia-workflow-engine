/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRenderData } from '@flowgram.ai/document';
import { useEntityFromContext } from '@flowgram.ai/core';

import { type WorkflowNodeEntity } from '../entities';

/**
 * 获取当前渲染的 dom 节点
 */
export function useCurrentDomNode(): HTMLDivElement {
  const entity = useEntityFromContext<WorkflowNodeEntity>();
  const renderData = entity.getData(FlowNodeRenderData)!;
  return renderData.node;
}
