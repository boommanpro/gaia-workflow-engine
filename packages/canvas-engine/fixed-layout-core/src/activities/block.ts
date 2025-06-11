import {
  DEFAULT_SPACING,
  FlowLayoutDefault,
  FlowNodeBaseType,
  type FlowNodeRegistry,
  FlowTransitionLabelEnum,
  type FlowTransitionLine,
  FlowTransitionLineEnum,
  LABEL_SIDE_TYPE,
} from '@flowgram.ai/document';

/**
 * block, block 的输入输出点由子节点决定
 */
export const BlockRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.BLOCK,
  meta: {
    spacing: DEFAULT_SPACING.NULL,
    inlineSpacingAfter: DEFAULT_SPACING.INLINE_BLOCK_PADDING_BOTTOM,
    hidden: true,
  },
  getLines(transition) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;
    const lines: FlowTransitionLine[] = [
      {
        type: FlowTransitionLineEnum.DIVERGE_LINE,
        from: currentTransform.parent!.inputPoint,
        to: currentTransform.inputPoint,
        side: LABEL_SIDE_TYPE.NORMAL_BRANCH,
      },
    ];

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
        const currentInputPointY = currentTransform.inputPoint.y;
        if (currentTransform?.next) {
          lines.push({
            type: FlowTransitionLineEnum.DRAGGING_LINE,
            from: currentTransform.parent!.inputPoint,
            to: {
              x: (currentOffsetRightX + nextOffsetLeftX) / 2,
              y: currentInputPointY,
            },
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
        const currentInputPointX = currentTransform.inputPoint.x;
        if (currentTransform?.next) {
          lines.push({
            type: FlowTransitionLineEnum.DRAGGING_LINE,
            from: currentTransform.parent!.inputPoint,
            to: {
              x: currentInputPointX,
              y: (currentOffsetBottomX + nextOffsetTopX) / 2,
            },
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
  getInputPoint(trans) {
    const child = trans.firstChild;
    return child ? child.inputPoint : trans.defaultInputPoint;
  },
  getOutputPoint(trans, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    const child = trans.lastChild;
    if (isVertical) {
      return {
        x: child ? child.outputPoint.x : trans.bounds.bottomCenter.x,
        y: trans.bounds.bottom,
      };
    }
    return {
      x: trans.bounds.right,
      y: child ? child.outputPoint.y : trans.bounds.rightCenter.y,
    };
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
        const currentInputPointY = currentTransform.inputPoint.y;
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
        const currentInputPointX = currentTransform.inputPoint.x;
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

  /**
   * @depreacted
   */
  addChild(node, json, options = {}) {
    const { index } = options;
    const document = node.document;
    return document.addNode({
      ...json,
      ...options,
      parent: node,
      index: typeof index === 'number' ? index + 1 : undefined,
    });
  },
};
