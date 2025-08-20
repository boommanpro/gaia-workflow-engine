/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Point } from '@flowgram.ai/utils';
import { FlowRendererKey } from '@flowgram.ai/renderer';
import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowNodeRenderData,
  FlowTransitionLabelEnum,
  FlowNodeSplitType,
  getDefaultSpacing,
  ConstantKeys,
} from '@flowgram.ai/document';

/**
 * 多输入节点, 只能作为 开始节点
 * - multiInputs:
 *   - inlineBlocks
 *     - input
 *     - input
 */
export const MultiInputsRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.MULTI_INPUTS,
  extend: FlowNodeSplitType.SIMPLE_SPLIT,
  extendChildRegistries: [
    {
      type: FlowNodeBaseType.BLOCK_ICON,
      meta: {
        hidden: true,
        spacing: 0,
      },
      getLines() {
        return [];
      },
      getLabels() {
        return [];
      },
    },
    {
      type: FlowNodeBaseType.INLINE_BLOCKS,
      meta: {
        inlineSpacingPre: 0,
      },
      getLabels(transition) {
        const isVertical = transition.entity.isVertical;
        const currentTransform = transition.transform;
        const spacing = getDefaultSpacing(
          transition.entity,
          ConstantKeys.INLINE_BLOCKS_PADDING_BOTTOM
        );

        if (currentTransform.collapsed || transition.entity.childrenLength === 0) {
          return [
            {
              type: FlowTransitionLabelEnum.CUSTOM_LABEL,
              renderKey: FlowRendererKey.BRANCH_ADDER,
              offset: Point.move(
                currentTransform.outputPoint,
                isVertical ? { y: spacing } : { x: spacing }
              ),
              props: {
                // 激活状态
                activated: transition.entity.getData(FlowNodeRenderData)!.activated,
                transform: currentTransform,
                // 传给外部使用的 node 信息
                node: currentTransform.originParent?.entity,
              },
            },
          ];
        }

        return [
          {
            type: FlowTransitionLabelEnum.CUSTOM_LABEL,
            renderKey: FlowRendererKey.BRANCH_ADDER,
            offset: Point.move(
              currentTransform.outputPoint,
              isVertical ? { y: -spacing / 2 } : { x: -spacing / 2 }
            ),
            props: {
              // 激活状态
              activated: transition.entity.getData(FlowNodeRenderData)!.activated,
              transform: currentTransform,
              // 传给外部使用的 node 信息
              node: currentTransform.originParent?.entity,
            },
          },
        ];
      },
    },
  ],
  getLabels() {
    return [];
  },
};
