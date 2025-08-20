/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, PositionSchema } from '@flowgram.ai/utils';
import {
  WorkflowNodeEntity,
  WorkflowPortEntity,
  WorkflowDragService,
} from '@flowgram.ai/free-layout-core';
import { FreeOperationType, HistoryService } from '@flowgram.ai/free-history-plugin';
import { TransformData } from '@flowgram.ai/core';

import { getPortBox } from './get-port-box';

export type IUpdateSubSequentNodesPosition = (params: {
  node: WorkflowNodeEntity;
  subsequentNodes: WorkflowNodeEntity[];
  fromPort: WorkflowPortEntity;
  toPort: WorkflowPortEntity;
  historyService: HistoryService;
  dragService: WorkflowDragService;
  containerNode?: WorkflowNodeEntity;
  offset?: IPoint;
}) => void;

/** 更新后续节点位置 */
export const updateSubSequentNodesPosition: IUpdateSubSequentNodesPosition = (params) => {
  const {
    node,
    subsequentNodes,
    fromPort,
    toPort,
    containerNode,
    offset,
    historyService,
    dragService,
  } = params;
  if (!offset || !toPort) {
    return;
  }
  // 更新后续节点位置
  const subsequentNodesPositions = subsequentNodes.map((node) => {
    const nodeTrans = node.getData(TransformData);
    return {
      x: nodeTrans.position.x,
      y: nodeTrans.position.y,
    };
  });
  historyService.pushOperation({
    type: FreeOperationType.dragNodes,
    value: {
      ids: subsequentNodes.map((node) => node.id),
      value: subsequentNodesPositions.map((position) => ({
        x: position.x + offset.x,
        y: position.y + offset.y,
      })),
      oldValue: subsequentNodesPositions,
    },
  });
  // 新增节点坐标需重新计算
  const fromBox = getPortBox(fromPort);
  const toBox = getPortBox(toPort, offset);
  const nodeTrans = node.getData(TransformData);
  let nodePos: PositionSchema = {
    x: (fromBox.center.x + toBox.center.x) / 2,
    y: (fromBox.y + toBox.y) / 2,
  };
  if (containerNode) {
    nodePos = dragService.adjustSubNodePosition(
      node.flowNodeType as string,
      containerNode,
      nodePos
    );
  }
  historyService.pushOperation({
    type: FreeOperationType.dragNodes,
    value: {
      ids: [node.id],
      value: [nodePos],
      oldValue: [
        {
          x: nodeTrans.position.x,
          y: nodeTrans.position.y,
        },
      ],
    },
  });
};
