import { Point } from '@flowgram.ai/utils';
import { FlowTextKey } from '@flowgram.ai/renderer';
import {
  FlowNodeBaseType,
  type FlowNodeEntity,
  type FlowNodeJSON,
  type FlowNodeRegistry,
  FlowTransitionLabelEnum,
  getDefaultSpacing,
  ConstantKeys,
} from '@flowgram.ai/document';

import {
  LoopEmptyBranchRegistry,
  LoopInlineBlocksNodeRegistry,
  LoopLeftEmptyBlockRegistry,
  LoopRightEmptyBlockRegistry,
  LoopSpacings,
  LoopTypeEnum,
} from './loop-extends';

/**
 * 循环节点
 */
export const LoopRegistry: FlowNodeRegistry = {
  type: 'loop',
  meta: {
    hidden: true,
    inlineSpacingAfter: (node) => {
      if (node.collapsed) {
        return LoopSpacings.COLLAPSE_INLINE_SPACING_BOTTOM;
      }
      const inlineSpacingBottom = getDefaultSpacing(
        node.entity,
        ConstantKeys.INLINE_SPACING_BOTTOM,
        LoopSpacings.INLINE_SPACING_BOTTOM
      );
      return inlineSpacingBottom;
    },
    spacing: LoopSpacings.SPACING,
  },
  /**
   * - loopNode
   *  - loopBlockIcon
   *  - loopInlineBlocks
   *    - loopEmptyBlock 左侧占位区域
   *    - loopBlock
   *      - xxx
   *      - xxx
   * @param node
   * @param json
   */
  onCreate(node: FlowNodeEntity, json: FlowNodeJSON) {
    const { document } = node;
    const loopBlocks = json.blocks || [];

    const loopIconNode = document.addNode({
      id: `$blockIcon$${node.id}`,
      type: FlowNodeBaseType.BLOCK_ICON,
      originParent: node,
      parent: node,
    });
    const loopInlineBlocks = document.addNode({
      id: `$inlineBlocks$${node.id}`,
      hidden: true,
      type: FlowNodeBaseType.INLINE_BLOCKS,
      originParent: node,
      parent: node,
    });
    const loopEmptyBlockNode = document.addNode({
      id: `$loopLeftEmpty$${node.id}`,
      hidden: true,
      type: LoopTypeEnum.LOOP_LEFT_EMPTY_BLOCK,
      originParent: node,
      parent: loopInlineBlocks,
    });

    const loopBlockNode = document.addNode({
      id: `$block$${node.id}`,
      hidden: true,
      type: FlowNodeBaseType.BLOCK, // : LoopTypeEnum.LOOP_RIGHT_EMPTY_BLOCK,
      originParent: node,
      parent: loopInlineBlocks,
    });
    const loopBranch = document.addNode({
      id: `$loopRightEmpty$${node.id}`,
      hidden: true,
      type: LoopTypeEnum.LOOP_EMPTY_BRANCH,
      originParent: node,
      parent: loopBlockNode,
    });
    const otherNodes: FlowNodeEntity[] = [];
    loopBlocks.forEach((b) =>
      document.addNode(
        {
          ...b,
          type: b.type!,
          parent: loopBlockNode,
        },
        otherNodes
      )
    );

    return [
      loopIconNode,
      loopEmptyBlockNode,
      loopInlineBlocks,
      loopBlockNode,
      loopBranch,
      ...otherNodes,
    ];
  },
  getLabels(transition) {
    const currentTransform = transition.transform;
    const { isVertical } = transition.entity;
    return [
      // 循环结束
      {
        type: FlowTransitionLabelEnum.TEXT_LABEL,
        renderKey: FlowTextKey.LOOP_END_TEXT,
        // 循环 label 垂直样式展示，而非 rotate 旋转文案
        props: isVertical
          ? undefined
          : {
              style: {
                maxWidth: '20px',
                lineHeight: '12px',
                whiteSpace: 'pre-wrap',
              },
            },
        offset: Point.move(currentTransform.outputPoint, isVertical ? { y: -26 } : { x: -26 }),
      },
      {
        type: FlowTransitionLabelEnum.ADDER_LABEL,
        offset: currentTransform.outputPoint,
      },
    ];
  },
  // 和前序节点对齐
  getInputPoint(transform) {
    const { isVertical } = transform.entity;
    if (isVertical) {
      return {
        x: transform.pre?.outputPoint.x || transform.firstChild?.outputPoint.x || 0,
        y: transform.bounds.top,
      };
    }
    return {
      x: transform.bounds.left,
      y: transform.pre?.outputPoint.y || transform.firstChild?.outputPoint.y || 0,
    };
  },
  getOutputPoint(transform) {
    const { isVertical } = transform.entity;
    if (isVertical) {
      return {
        x: transform.pre?.outputPoint.x || transform.firstChild?.outputPoint.x || 0,
        y: transform.bounds.bottom,
      };
    }
    return {
      x: transform.bounds.right,
      y: transform.pre?.outputPoint.y || transform.firstChild?.outputPoint.y || 0,
    };
  },

  extendChildRegistries: [
    {
      type: FlowNodeBaseType.BLOCK_ICON,
      meta: {
        spacing: LoopSpacings.LOOP_BLOCK_ICON_SPACING,
      },
    },
    LoopLeftEmptyBlockRegistry,
    LoopEmptyBranchRegistry,
    LoopRightEmptyBlockRegistry,
    LoopInlineBlocksNodeRegistry,
  ],

  /**
   * @depreacted
   */
  addChild(node, json, options = {}) {
    const { index } = options;
    const document = node.document;
    return document.addNode({
      ...json,
      ...options,
      parent: document.getNode(`$block$${node.id}`),
      index: typeof index === 'number' ? index + 1 : undefined,
    });
  },
};
