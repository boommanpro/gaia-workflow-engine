/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowRendererKey } from '@flowgram.ai/renderer';
import {
  DEFAULT_SPACING,
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowNodeRenderData,
  FlowTransitionLabelEnum,
  FlowTransitionLineEnum,
  FlowLayoutDefault,
} from '@flowgram.ai/document';

import { TryCatchSpacings, TryCatchTypeEnum } from './constants';

/**
 * catch 分支列表
 */
export const CatchInlineBlocksRegistry: FlowNodeRegistry = {
  extend: FlowNodeBaseType.INLINE_BLOCKS,
  type: TryCatchTypeEnum.CATCH_INLINE_BLOCKS,
  meta: {
    spacing: DEFAULT_SPACING.NULL,
    inlineSpacingPre: DEFAULT_SPACING.NULL,
    // inlineSpacingAfter: DEFAULT_SPACING.NULL,
  },
  getDelta() {
    return undefined;
  },
  getLines(transition) {
    const { transform } = transition;
    const mainInlineBlocks = transform.parent!;

    const lines = [
      {
        type: FlowTransitionLineEnum.DIVERGE_LINE,
        from: mainInlineBlocks.pre!.outputPoint,
        to: transform.inputPoint,
      },
    ];

    if (!transform.entity.isNodeEnd) {
      lines.push({
        type: FlowTransitionLineEnum.MERGE_LINE,
        from: transform.outputPoint,
        to: mainInlineBlocks.outputPoint,
      });
    }

    return lines;
  },
  getOriginDeltaX(transform) {
    const { firstChild } = transform;
    if (!firstChild) return 0;
    return firstChild.originDeltaX;
  },
  getLabels(transition) {
    const { inputPoint } = transition.transform;
    const { isVertical } = transition.entity;
    const currentTransform = transition.transform;

    // 实际输入点
    const actualInputPoint = {
      x: isVertical ? inputPoint.x : inputPoint.x - TryCatchSpacings.CATCH_INLINE_SPACING,
      y: isVertical ? inputPoint.y - TryCatchSpacings.CATCH_INLINE_SPACING : inputPoint.y,
    };

    if (currentTransform.collapsed) {
      return [];
    }

    // branch adder 节点
    return [
      {
        type: FlowTransitionLabelEnum.CUSTOM_LABEL,
        renderKey: FlowRendererKey.BRANCH_ADDER,
        offset: actualInputPoint,
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
  getInputPoint(transform, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    // 因为是左偏移，所以用第一条 catch 分支
    const firstCatchBlock = transform.firstChild;
    if (firstCatchBlock) {
      return firstCatchBlock.inputPoint;
    }
    return isVertical ? transform.bounds.topCenter : transform.bounds.rightCenter;
  },
  getOutputPoint(transform, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);

    // 收缩时，出点为入点
    if (transform.collapsed) {
      return transform.inputPoint;
    }

    const firstCatchBlock = transform.firstChild;
    if (firstCatchBlock) {
      return isVertical
        ? {
            x: firstCatchBlock!.outputPoint?.x,
            y: transform.bounds.bottom,
          }
        : {
            x: transform.bounds.right,
            y: firstCatchBlock!.outputPoint?.y,
          };
    }
    return isVertical ? transform.bounds.bottomCenter : transform.bounds.rightCenter;
  },
};
