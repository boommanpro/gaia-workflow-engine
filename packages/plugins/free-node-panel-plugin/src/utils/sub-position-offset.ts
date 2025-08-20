/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';
import { WorkflowNodeEntity, WorkflowPortEntity } from '@flowgram.ai/free-layout-core';
import { FlowNodeTransformData } from '@flowgram.ai/document';

import { rectDistance } from './rect-distance';
import { isGreaterThan, isLessThan } from './greater-or-less';
import { getPortBox } from './get-port-box';

export interface XYSchema {
  x: number;
  y: number;
}

export type ISubPositionOffset = (params: {
  node: WorkflowNodeEntity;
  fromPort: WorkflowPortEntity;
  toPort: WorkflowPortEntity;
  padding: XYSchema;
}) => XYSchema | undefined;

/** 后续节点位置偏移 */
export const subPositionOffset: ISubPositionOffset = (params) => {
  const { node, fromPort, toPort, padding } = params;

  const fromBox = getPortBox(fromPort);
  const toBox = getPortBox(toPort);

  const nodeTrans = node.getData(FlowNodeTransformData);
  const nodeSize = node.getNodeMeta()?.size ?? {
    width: nodeTrans.bounds.width,
    height: nodeTrans.bounds.height,
  };

  // 最小距离
  const minDistance: IPoint = {
    x: nodeSize.width + padding.x,
    y: nodeSize.height + padding.y,
  };
  // from 与 to 的距离
  const boxDistance = rectDistance(fromBox, toBox);

  // 需要的偏移量
  const neededOffset: IPoint = {
    x: isGreaterThan(boxDistance.x, minDistance.x) ? 0 : minDistance.x - boxDistance.x,
    y: isGreaterThan(boxDistance.y, minDistance.y) ? 0 : minDistance.y - boxDistance.y,
  };

  // 至少有一个方向满足要求，无需偏移
  if (neededOffset.x === 0 || neededOffset.y === 0) {
    return;
  }

  // 是否存在相交
  const intersection = {
    // 这里没有写反，Rectangle内置的算法是反的
    vertical: Rectangle.intersects(fromBox, toBox, 'horizontal'),
    horizontal: Rectangle.intersects(fromBox, toBox, 'vertical'),
  };

  // 初始化偏移量
  let offsetX: number = 0;
  let offsetY: number = 0;

  if (!intersection.horizontal) {
    // 水平不相交，需要加垂直方向的偏移
    if (isGreaterThan(toBox.center.y, fromBox.center.y)) {
      // B在A下方
      offsetY = neededOffset.y;
    } else if (isLessThan(toBox.center.y, fromBox.center.y)) {
      // B在A上方
      offsetY = -neededOffset.y;
    }
  }

  if (!intersection.vertical) {
    // 垂直不相交，需要加水平方向的偏移
    if (isGreaterThan(toBox.center.x, fromBox.center.x)) {
      // B在A右侧
      offsetX = neededOffset.x;
    } else if (isLessThan(toBox.center.x, fromBox.center.x)) {
      // B在A左侧
      offsetX = -neededOffset.x;
    }
  }

  return {
    x: offsetX,
    y: offsetY,
  };
};
