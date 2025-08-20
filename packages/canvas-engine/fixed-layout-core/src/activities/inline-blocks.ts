/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Point } from '@flowgram.ai/utils';
import { FlowRendererKey } from '@flowgram.ai/renderer';
import {
  DEFAULT_SPACING,
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowNodeRenderData,
  FlowNodeTransformData,
  type FlowNodeTransitionData,
  FlowTransitionLabelEnum,
  FlowLayoutDefault,
  ConstantKeys,
  getDefaultSpacing,
} from '@flowgram.ai/document';

/**
 * 水平 Block 的偏移
 */
export const InlineBlocksRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.INLINE_BLOCKS,
  meta: {
    hidden: true,
    spacing: (node) => getDefaultSpacing(node.entity, ConstantKeys.NODE_SPACING),
    isInlineBlocks: true,
    inlineSpacingPre: (node) =>
      getDefaultSpacing(node.entity, ConstantKeys.INLINE_BLOCKS_PADDING_TOP) ||
      DEFAULT_SPACING.INLINE_BLOCKS_PADDING_TOP,
    inlineSpacingAfter: (node) =>
      getDefaultSpacing(node.entity, ConstantKeys.INLINE_BLOCKS_PADDING_BOTTOM),
  },
  /**
   * 控制子分支的间距
   * @param child
   */
  getChildDelta(child, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    const preTransform = child.entity.pre?.getData(FlowNodeTransformData);
    if (preTransform) {
      const { localBounds: preBounds } = preTransform;
      if (isVertical) {
        const leftSpacing = preTransform.size.width + preTransform.originDeltaX;

        // 如果小于最小宽度，偏移最小宽度的距离
        const delta = Math.max(
          child.parent!.minInlineBlockSpacing - leftSpacing,
          getDefaultSpacing(child.entity, ConstantKeys.BRANCH_SPACING) - child.originDeltaX
        );

        return {
          // 这里需要加上原点的偏移量，并加上水平间距
          x: preBounds.right + delta,
          y: 0,
        };
      } else {
        const bottomSpacing = preTransform.size.height + preTransform.originDeltaY;

        // 如果小于最小高度，偏移最小高度的距离
        const delta = Math.max(
          child.parent!.minInlineBlockSpacing - bottomSpacing,
          getDefaultSpacing(child.entity, ConstantKeys.BRANCH_SPACING) - child.originDeltaY
        );

        return {
          x: 0,
          // 这里需要加上原点的偏移量，并加上垂直间距
          y: preBounds.bottom + delta,
        };
      }
    }
    return {
      x: 0,
      y: 0,
    };
  },
  /**
   * 控制条件分支居中布局
   * @param trans
   */
  getDelta(trans, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    const { pre, collapsed } = trans;

    if (collapsed) {
      return { x: 0, y: 0 };
    }

    if (isVertical) {
      const preCenter = pre!.localBounds.center.x;
      const firstBlockX = trans.firstChild?.transform.position.x || 0;
      const lastBlockX = trans.lastChild?.transform.position.x || 0;
      const currentCenter = (lastBlockX - firstBlockX) / 2;

      return {
        x: preCenter - currentCenter,
        y: 0,
      };
    }
    const preCenter = pre!.localBounds.center.y;
    const firstBlockY = trans.firstChild?.transform.position.y || 0;
    const lastBlockY = trans.lastChild?.transform.position.y || 0;
    const currentCenter = (lastBlockY - firstBlockY) / 2;

    return {
      x: 0,
      y: preCenter - currentCenter,
    };
  },
  getLabels(transition) {
    return getBranchAdderLabel(transition);
  },
  getLines() {
    return [];
  },
  // 和前序节点对齐
  getInputPoint(transform, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    if (isVertical) {
      return {
        x: transform.pre?.outputPoint.x || 0,
        y: transform.bounds.top,
      };
    }
    return {
      x: transform.bounds.left,
      y: transform.pre?.outputPoint.y || 0,
    };
  },
  getOutputPoint(transform, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    // 收缩时，出点为入点
    if (transform.collapsed) {
      return transform.inputPoint;
    }

    if (isVertical) {
      return {
        x: transform.pre?.outputPoint.x || 0,
        y: transform.bounds.bottom,
      };
    }
    return {
      x: transform.bounds.right,
      y: transform.pre?.outputPoint.y || 0,
    };
  },
};

/**
 * inlineBlocks 获取 BranchAdder 和展开 label
 */
export function getBranchAdderLabel(transition: FlowNodeTransitionData) {
  const { isVertical } = transition.entity;
  const currentTransform = transition.transform;

  // 收起时展示收起 label
  if (currentTransform.collapsed) {
    return [
      {
        type: FlowTransitionLabelEnum.COLLAPSE_LABEL,
        offset: Point.move(currentTransform.inputPoint, isVertical ? { y: 10 } : { x: 10 }),
        props: {
          activateNode: transition.entity.pre,
        },
      },
    ];
  }

  return [
    {
      type: FlowTransitionLabelEnum.CUSTOM_LABEL,
      renderKey: FlowRendererKey.BRANCH_ADDER,
      offset: Point.move(currentTransform.inputPoint, isVertical ? { y: 10 } : { x: 10 }),
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
