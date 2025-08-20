/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowRendererKey, FlowTextKey } from '@flowgram.ai/renderer';
import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowNodeTransformData,
  FlowTransitionLabelEnum,
  FlowTransitionLineEnum,
  FlowLayoutDefault,
  getDefaultSpacing,
  ConstantKeys,
} from '@flowgram.ai/document';

import { TryCatchSpacings, TryCatchTypeEnum } from './constants';

/**
 * 主 BLOCK
 */
export const MainInlineBlocksRegistry: FlowNodeRegistry = {
  extend: FlowNodeBaseType.INLINE_BLOCKS,
  type: TryCatchTypeEnum.MAIN_INLINE_BLOCKS,
  meta: {
    inlineSpacingPre: TryCatchSpacings.MAIN_INLINE_SPACING_TOP,
    inlineSpacingAfter: TryCatchSpacings.MAIN_INLINE_SPACING_BOTTOM,
  },
  getLines(transition) {
    const { transform } = transition;
    const tryBranch = transform.firstChild!;

    const lines = [
      {
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: tryBranch.outputPoint,
        to: transform.originParent!.outputPoint,
      },
    ];

    return lines;
  },
  getLabels(transition) {
    const { transform } = transition;
    const { isVertical } = transition.entity;
    const catchInlineBlocks = transform.children[1]!;
    const errLabelX = isVertical
      ? (transform.parent!.outputPoint.x + catchInlineBlocks.inputPoint.x) / 2
      : transform.inputPoint.x - TryCatchSpacings.INLINE_SPACING_TOP;
    const errLabelY = isVertical
      ? transform.inputPoint.y - TryCatchSpacings.INLINE_SPACING_TOP
      : (transform.parent!.outputPoint.y + catchInlineBlocks.inputPoint.y) / 2;

    const errorLabelX = errLabelX;
    const errorLabelY = errLabelY;
    return [
      {
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.TRY_START_TEXT,
        offset: {
          x: isVertical
            ? transform.inputPoint.x
            : transform.inputPoint.x + TryCatchSpacings.TRY_START_LABEL_DELTA,
          y: isVertical
            ? transform.inputPoint.y + TryCatchSpacings.TRY_START_LABEL_DELTA
            : transform.inputPoint.y,
        },
      },
      {
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.TRY_END_TEXT,
        offset: {
          x: isVertical
            ? transform.inputPoint.x
            : transform.originParent!.outputPoint.x + TryCatchSpacings.TRY_END_LABEL_DELTA,
          y: isVertical
            ? transform.originParent!.outputPoint.y + TryCatchSpacings.TRY_END_LABEL_DELTA
            : transform.inputPoint.y,
        },
      },
      // 错误分支收起
      {
        type: FlowTransitionLabelEnum.CUSTOM_LABEL,
        renderKey: FlowRendererKey.TRY_CATCH_COLLAPSE,
        offset: {
          x: errorLabelX,
          y: errorLabelY,
        },
        props: {
          node: transform.lastChild?.entity,
        },
      },
    ];
  },
  getInputPoint(transform) {
    const tryBlock = transform.firstChild!;
    return tryBlock.inputPoint;
  },
  getOutputPoint(transform, layout) {
    const tryBlock = transform.firstChild!;
    const isVertical = FlowLayoutDefault.isVertical(layout);
    if (isVertical) {
      return {
        x: tryBlock.outputPoint.x,
        y: transform.bounds.bottom + TryCatchSpacings.CATCH_INLINE_SPACING,
      };
    }
    return {
      x: transform.bounds.right + TryCatchSpacings.CATCH_INLINE_SPACING,
      y: tryBlock.outputPoint.y,
    };
  },
  getDelta() {
    return undefined;
  },
  getChildDelta(child, layout) {
    const preTransform = child.entity.pre?.getData(FlowNodeTransformData);
    const isVertical = FlowLayoutDefault.isVertical(layout);
    if (preTransform) {
      const { localBounds: preBounds } = preTransform;
      // try 分支和 catch 分支的最小间距不低于 minInlineBlockSpacing
      let delta = 0;
      if (isVertical) {
        delta = Math.max(
          child.parent!.minInlineBlockSpacing,
          -child.originDeltaX + getDefaultSpacing(child.entity, ConstantKeys.BRANCH_SPACING)
        );
      } else {
        delta = Math.max(
          child.parent!.minInlineBlockSpacing,
          -child.originDeltaY + getDefaultSpacing(child.entity, ConstantKeys.BRANCH_SPACING)
        );
      }

      return {
        // 分支只有两个所以这里可以写死间隔宽度
        x: isVertical ? preBounds.right + delta : 0,
        y: isVertical ? 0 : preBounds.bottom + delta,
      };
    }
    return {
      x: 0,
      y: 0,
    };
  },
};
