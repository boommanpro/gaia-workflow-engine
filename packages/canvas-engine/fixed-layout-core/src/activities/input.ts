/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  FlowNodeBaseType,
  type FlowNodeRegistry,
  type FlowTransitionLine,
  FlowTransitionLineEnum,
  LABEL_SIDE_TYPE,
  FlowTransitionLabelEnum,
} from '@flowgram.ai/document';

/**
 * 输入节点
 */
export const InputRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.INPUT,
  extend: FlowNodeBaseType.BLOCK,
  meta: {
    hidden: false,
  },
  getLines(transition, layout) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;
    const lines: FlowTransitionLine[] = [];

    const hasBranchDraggingAdder =
      currentTransform && currentTransform.entity.isInlineBlock && transition.renderData.draggable;

    // 分支拖拽场景线条 push
    // 当有其余分支的时候，绘制一条两个分支之间的线条
    if (hasBranchDraggingAdder) {
      if (isVertical) {
        const currentOffsetRightX = currentTransform.firstChild
          ? currentTransform.firstChild.bounds.right
          : currentTransform.bounds.right;
        const nextOffsetLeftX =
          (currentTransform.next?.firstChild
            ? currentTransform.next?.firstChild.bounds?.left
            : currentTransform.next?.bounds?.left) || 0;
        const currentInputPointY = currentTransform.outputPoint.y;
        if (currentTransform?.next) {
          lines.push({
            type: FlowTransitionLineEnum.MERGE_LINE,
            isDraggingLine: true,
            from: {
              x: (currentOffsetRightX + nextOffsetLeftX) / 2,
              y: currentInputPointY,
            },
            to: currentTransform.parent!.outputPoint,
            side: LABEL_SIDE_TYPE.NORMAL_BRANCH,
          });
        }
      } else {
        const currentOffsetBottomX = currentTransform.firstChild
          ? currentTransform.firstChild.bounds.bottom
          : currentTransform.bounds.bottom;
        const nextOffsetTopX =
          (currentTransform.next?.firstChild
            ? currentTransform.next?.firstChild.bounds?.top
            : currentTransform.next?.bounds?.top) || 0;
        const currentInputPointX = currentTransform.outputPoint.x;
        if (currentTransform?.next) {
          lines.push({
            type: FlowTransitionLineEnum.MERGE_LINE,
            isDraggingLine: true,
            from: {
              x: currentInputPointX,
              y: (currentOffsetBottomX + nextOffsetTopX) / 2,
            },
            to: currentTransform.parent!.outputPoint,
            side: LABEL_SIDE_TYPE.NORMAL_BRANCH,
          });
        }
      }
    }

    // 最后一个节点是 end 节点，不绘制 mergeLine
    if (!transition.isNodeEnd) {
      lines.push({
        type: FlowTransitionLineEnum.MERGE_LINE,
        from: currentTransform.outputPoint,
        to: currentTransform.parent!.outputPoint,
        side: LABEL_SIDE_TYPE.NORMAL_BRANCH,
      });
    }

    return lines;
  },
  getLabels(transition) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;

    const draggingLabel = [];

    const hasBranchDraggingAdder =
      currentTransform && currentTransform.entity.isInlineBlock && transition.renderData.draggable;

    // 获取两个分支节点中间点作为拖拽标签插入位置
    if (hasBranchDraggingAdder) {
      if (isVertical) {
        const currentOffsetRightX = currentTransform.firstChild
          ? currentTransform.firstChild.bounds.right
          : currentTransform.bounds.right;
        const nextOffsetLeftX =
          (currentTransform.next?.firstChild
            ? currentTransform.next.firstChild.bounds?.left
            : currentTransform.next?.bounds?.left) || 0;
        const currentInputPointY = currentTransform.outputPoint.y;
        if (currentTransform?.next) {
          draggingLabel.push({
            offset: {
              x: (currentOffsetRightX + nextOffsetLeftX) / 2,
              y: currentInputPointY,
            },
            type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL,
            width: nextOffsetLeftX - currentOffsetRightX,
            props: {
              side: LABEL_SIDE_TYPE.NORMAL_BRANCH,
            },
          });
        }
      } else {
        const currentOffsetBottomX = currentTransform.firstChild
          ? currentTransform.firstChild.bounds.bottom
          : currentTransform.bounds.bottom;
        const nextOffsetTopX =
          (currentTransform.next?.firstChild
            ? currentTransform.next.firstChild.bounds?.top
            : currentTransform.next?.bounds?.top) || 0;
        const currentInputPointX = currentTransform.outputPoint.x;
        if (currentTransform?.next) {
          draggingLabel.push({
            offset: {
              x: currentInputPointX,
              y: (currentOffsetBottomX + nextOffsetTopX) / 2,
            },
            type: FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL,
            width: nextOffsetTopX - currentOffsetBottomX,
            props: {
              side: LABEL_SIDE_TYPE.NORMAL_BRANCH,
            },
          });
        }
      }
    }

    return [...draggingLabel];
  },
};
