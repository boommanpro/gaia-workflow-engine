/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, PaddingSchema } from '@flowgram.ai/utils';
import { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { FlowNodeBaseType } from '@flowgram.ai/document';

/**
 * 如果存在容器节点，且传入鼠标坐标，需要用容器的坐标减去传入的鼠标坐标
 */
export const adjustSubNodePosition = (params: {
  targetNode: WorkflowNodeEntity;
  containerNode: WorkflowNodeEntity;
  containerPadding: PaddingSchema;
}): IPoint => {
  const { targetNode, containerNode, containerPadding } = params;
  if (containerNode.flowNodeType === FlowNodeBaseType.ROOT) {
    return targetNode.transform.position;
  }
  const nodeWorldTransform = targetNode.transform.transform.worldTransform;
  const containerWorldTransform = containerNode.transform.transform.worldTransform;
  const nodePosition = {
    x: nodeWorldTransform.tx,
    y: nodeWorldTransform.ty,
  };
  const isParentEmpty = !containerNode.children || containerNode.children.length === 0;
  if (isParentEmpty) {
    // 确保空容器节点不偏移
    return {
      x: 0,
      y: containerPadding.top,
    };
  } else {
    return {
      x: nodePosition.x - containerWorldTransform.tx,
      y: nodePosition.y - containerWorldTransform.ty,
    };
  }
};
