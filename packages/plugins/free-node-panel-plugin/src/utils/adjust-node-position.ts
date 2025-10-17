/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PositionSchema } from '@flowgram.ai/utils';
import {
  WorkflowDocument,
  WorkflowDragService,
  WorkflowNodeEntity,
  WorkflowPortEntity,
} from '@flowgram.ai/free-layout-core';

export type IAdjustNodePosition = (params: {
  nodeType: string;
  position: PositionSchema;
  document: WorkflowDocument;
  dragService: WorkflowDragService;
  fromPort?: WorkflowPortEntity;
  toPort?: WorkflowPortEntity;
  containerNode?: WorkflowNodeEntity;
}) => PositionSchema;

/** 调整节点坐标 */
export const adjustNodePosition: IAdjustNodePosition = (params) => {
  const { nodeType, position, fromPort, toPort, containerNode, document, dragService } = params;
  const register = document.getNodeRegistry(nodeType);
  const size = register?.meta?.size;
  let adjustedPosition = position;
  if (!size) {
    adjustedPosition = position;
  }
  // 计算坐标偏移
  else if (fromPort && toPort) {
    // 输入输出
    adjustedPosition = {
      x: position.x,
      y: position.y - size.height / 2,
    };
  } else if (fromPort && !toPort) {
    // 仅输入
    if (fromPort.location === 'bottom') {
      adjustedPosition = {
        x: position.x,
        y: position.y,
      };
    } else {
      adjustedPosition = {
        x: position.x + size.width / 2,
        y: position.y - size.height / 2,
      };
    }
  } else if (!fromPort && toPort) {
    // 仅输出
    adjustedPosition = {
      x: position.x - size.width / 2,
      y: position.y - size.height / 2,
    };
  } else {
    adjustedPosition = position;
  }
  return dragService.adjustSubNodePosition(nodeType, containerNode, adjustedPosition);
};
