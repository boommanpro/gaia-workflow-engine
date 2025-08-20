/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Point } from '@flowgram.ai/utils';
import { DefaultSpacingKey, getDefaultSpacing } from '@flowgram.ai/document';
import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowTransitionLabelEnum,
} from '@flowgram.ai/document';

/**
 * 带顺序的图标节点，一般为 block 第一个分支节点
 * - 只有一个分支时，不需要展开收起
 */
export const BlockOrderIconRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.BLOCK_ORDER_ICON,
  meta: {
    spacing: 40,
  },
  getLabels(transition) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;

    const currentOutput = currentTransform.outputPoint;
    const nextTransform = currentTransform.next;
    const parentTransform = currentTransform.parent;

    // 为空分支，画一个加号即可
    if (transition.entity.parent!.collapsedChildren.length <= 1) {
      const parentOutput = parentTransform?.outputPoint as IPoint;
      return [
        {
          offset: parentOutput,
          type: FlowTransitionLabelEnum.ADDER_LABEL,
        },
      ];
    }

    const collapsedSpacing = getDefaultSpacing(
      transition.entity,
      DefaultSpacingKey.COLLAPSED_SPACING
    );

    return [
      {
        offset: nextTransform
          ? Point.getMiddlePoint(currentOutput, nextTransform.inputPoint)
          : Point.move(
              currentOutput,
              isVertical ? { y: collapsedSpacing } : { x: collapsedSpacing }
            ),
        // 收起展开复合按钮
        type: FlowTransitionLabelEnum.COLLAPSE_ADDER_LABEL,
        props: {
          activateNode: transition.entity,
          collapseNode: transition.entity.parent,
        },
      },
    ];
  },
};
