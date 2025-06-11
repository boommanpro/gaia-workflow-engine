import {
  FlowLayoutDefault,
  type FlowNodeRegistry,
  FlowNodeSplitType,
  FlowTransitionLabelEnum,
  ConstantKeys,
  getDefaultSpacing,
} from '@flowgram.ai/document';

/**
 * 可以动态添加分支的分支节点
 * dynamicSplit:  (最原始的 id)
 *  blockIcon
 *  inlineBlocks
 *    block1
 *      blockOrderIcon
 *    block2
 *      blockOrderIcon
 */
export const DynamicSplitRegistry: FlowNodeRegistry = {
  type: FlowNodeSplitType.DYNAMIC_SPLIT,
  meta: {
    hidden: true,
    inlineSpacingAfter: (node) =>
      node.collapsed && node.entity.collapsedChildren.length > 1 ? 21 : 0,
    // 判断是否有分支节点
    spacing: (node) => {
      const spacing = getDefaultSpacing(node.entity, ConstantKeys.NODE_SPACING);
      return node.children.length === 1 ? spacing : spacing / 2;
    },
  },
  getLabels(transition) {
    if (transition.isNodeEnd) {
      return [];
    }

    return [
      {
        type: FlowTransitionLabelEnum.ADDER_LABEL,
        offset: transition.transform.outputPoint,
      },
    ];
  },
  onCreate(node, json) {
    return node.document.addInlineBlocks(node, json.blocks || []);
  },
  getInputPoint(transform) {
    // block icon
    return transform.firstChild?.inputPoint || transform.defaultInputPoint;
  },
  getOutputPoint(transform, layout) {
    const isVertical = FlowLayoutDefault.isVertical(layout);
    // 没有分支节点
    const noInlineBlocks = transform.children.length === 1;
    const lastChildOutput = transform.lastChild?.outputPoint;
    const spacing = getDefaultSpacing(transform.entity, ConstantKeys.NODE_SPACING);

    if (isVertical) {
      return {
        x: lastChildOutput ? lastChildOutput.x : transform.bounds.center.x,
        y: transform.bounds.bottom + (noInlineBlocks ? spacing / 2 : 0),
      };
    }

    return {
      x: transform.bounds.right + (noInlineBlocks ? spacing / 2 : 0),
      y: lastChildOutput ? lastChildOutput.y : transform.bounds.center.y,
    };
  },

  /**
   * @depreacted
   */
  addChild(node, json, options = {}) {
    const { index } = options;
    const document = node.document;
    const parentId = `$inlineBlocks$${node.id}`;
    let parent = document.getNode(parentId);
    if (!parent) {
      parent = document.addNode({
        id: parentId,
        type: 'inlineBlocks',
        originParent: node,
        parent: node,
      });
    }
    return document.addBlock(node, json, undefined, undefined, index);
  },
};
