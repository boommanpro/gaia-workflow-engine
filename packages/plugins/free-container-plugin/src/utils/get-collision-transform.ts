/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PositionSchema, Rectangle } from '@flowgram.ai/utils';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { FlowNodeTransformData } from '@flowgram.ai/document';

import { isRectIntersects } from './is-rect-intersects';
import { isPointInRect } from './is-point-in-rect';

/** 获取重叠位置 */
export const getCollisionTransform = (params: {
  transforms: FlowNodeTransformData[];
  targetRect?: Rectangle;
  targetPoint?: PositionSchema;
  withPadding?: boolean;
  document: WorkflowDocument;
}): FlowNodeTransformData | undefined => {
  const { targetRect, targetPoint, transforms, withPadding = false, document } = params;
  const collisionTransform = transforms.find((transform) => {
    const { bounds, entity } = transform;
    const padding = withPadding ? document.layout.getPadding(entity) : { left: 0, right: 0 };
    const transformRect = new Rectangle(
      bounds.x + padding.left + padding.right,
      bounds.y,
      bounds.width,
      bounds.height
    );
    // 检测两个正方形是否相互碰撞
    if (targetRect) {
      return isRectIntersects(targetRect, transformRect);
    }
    if (targetPoint) {
      return isPointInRect(targetPoint, transformRect);
    }
    return false;
  });
  return collisionTransform;
};
