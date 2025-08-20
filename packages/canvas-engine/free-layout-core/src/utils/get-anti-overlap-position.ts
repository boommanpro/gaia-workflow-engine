/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { TransformData } from '@flowgram.ai/core';
import { type IPoint } from '@flowgram.ai/utils';

import { type WorkflowDocument } from '../workflow-document';
import { WorkflowNodeEntity } from '../entities';

/**
 * 获取没有碰撞的位置
 * 距离很小时，xy 各偏移 30
 * @param position
 */
export function getAntiOverlapPosition(
  doc: WorkflowDocument,
  position: IPoint,
  containerNode?: WorkflowNodeEntity,
): IPoint {
  let { x, y } = position;
  const nodes = containerNode ? containerNode.collapsedChildren : doc.getAllNodes();
  const positions = nodes
    .map(n => {
      const transform = n.getData<TransformData>(TransformData)!;
      return { x: transform.position.x, y: transform.position.y };
    })
    .sort((a, b) => a.y - b.y);
  const minDistance = 3;
  for (const pos of positions) {
    const { x: posX, y: posY } = pos;
    if (y - posY < -minDistance) {
      break;
    }
    const deltaX = Math.abs(x - posX);
    const deltaY = Math.abs(y - posY);
    if (deltaX <= minDistance && deltaY <= minDistance) {
      x += 30;
      y += 30;
    }
  }
  return { x, y };
}
