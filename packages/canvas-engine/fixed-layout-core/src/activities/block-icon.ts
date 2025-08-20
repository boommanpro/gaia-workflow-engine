/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Point } from '@flowgram.ai/utils';
import { DefaultSpacingKey, getDefaultSpacing } from '@flowgram.ai/document';
import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowTransitionLabelEnum,
} from '@flowgram.ai/document';

/**
 * 图标占位节点，如条件分支的菱形图标
 */
export const BlockIconRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.BLOCK_ICON,
  meta: {
    spacing: 20, // 占位节点下边偏小
    // 条件分支 icon 默认的高度比较高，在流程里下边有文字
    size: { width: 250, height: 84 },
  },
  /**
   * 是一个占位节点，后续要加上 label 展开收起的图标
   */
  getLabels(transition) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;

    // 为节点，画一个加号即可
    if (transition.entity.parent!.collapsedChildren.length <= 1) {
      return [];
    }

    const collapsedSpacing = getDefaultSpacing(
      transition.entity,
      DefaultSpacingKey.COLLAPSED_SPACING
    );

    return [
      {
        type: FlowTransitionLabelEnum.COLLAPSE_LABEL,
        offset: Point.move(
          currentTransform.outputPoint,
          isVertical ? { y: collapsedSpacing } : { x: collapsedSpacing }
        ),
        props: {
          collapseNode: transition.entity.parent,
          activateNode: transition.entity,
        },
      },
    ];
  },
};
