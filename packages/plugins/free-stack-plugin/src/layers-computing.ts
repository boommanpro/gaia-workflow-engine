/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import type { WorkflowLineEntity } from '@flowgram.ai/free-layout-core';
import { FlowNodeRenderData } from '@flowgram.ai/document';

import type { StackingContext } from './type';
import { StackingBaseIndex, StackingConfig, StackingType } from './constant';

namespace NodeComputing {
  export const compute = (node: WorkflowNodeEntity, context: StackingContext): void => {
    const zIndex = nodeZIndex(node, context);
    const element = nodeElement(node);
    element.style.position = 'absolute';
    element.style.zIndex = zIndexStringify(zIndex);
  };

  export const stackingIndex = (stackingType: StackingType, level: number): number | undefined => {
    if (level < 1) {
      // root节点
      return undefined;
    }
    const baseZIndex = StackingBaseIndex[stackingType];
    const zIndex =
      StackingConfig.startIndex + StackingConfig.levelIndexStep * (level - 1) + baseZIndex;
    return zIndex;
  };

  export const nodeStackingLevel = (
    node: WorkflowNodeEntity,
    context: StackingContext,
    disableTopLevel = false
  ): number => {
    // TODO 后续支持多层级时这个计算逻辑应该去掉，level信息应该直接由 FlowNodeEntity 缓存给出
    // 多层时这里的计算会有 O(logN) 时间复杂度，并且在多层级联同计算时会有BUG，本次需求不处理这种情况
    const unReversedLinage: WorkflowNodeEntity[] = [];
    let currentNode: WorkflowNodeEntity | undefined = node;
    while (currentNode) {
      unReversedLinage.push(currentNode);
      currentNode = currentNode.parent;
    }
    const linage = unReversedLinage.reverse();
    const nodeLevel = linage.length - 1;

    const topLevelIndex = linage.findIndex((node: WorkflowNodeEntity) => {
      if (context.selectedIDs.includes(node.id)) {
        // 存在被选中的父级或自身被选中，直接置顶
        return true;
      }
      return false;
    });
    const topLevel = StackingConfig.allowLevel + (linage.length - topLevelIndex);

    if (!disableTopLevel && topLevelIndex !== -1) {
      // 置顶
      return topLevel;
    }

    return nodeLevel;
  };

  export const zIndexStringify = (zIndex?: number): string => {
    if (zIndex === undefined) {
      return 'auto';
    }
    return zIndex.toString();
  };

  const nodeZIndex = (node: WorkflowNodeEntity, context: StackingContext): number | undefined => {
    const level = nodeStackingLevel(node, context);
    const zIndex = stackingIndex(StackingType.Node, level);
    return zIndex;
  };

  const nodeElement = (node: WorkflowNodeEntity): HTMLDivElement => {
    const nodeRenderData = node.getData<FlowNodeRenderData>(FlowNodeRenderData);
    return nodeRenderData.node;
  };
}

namespace LineComputing {
  export const compute = (line: WorkflowLineEntity, context: StackingContext): void => {
    const zIndex = lineZIndex(line, context);
    const element = line.node;
    element.style.position = 'absolute';
    element.style.zIndex = NodeComputing.zIndexStringify(zIndex);
  };

  const lineStackingLevel = (line: WorkflowLineEntity, context: StackingContext): number => {
    if (
      line.isDrawing || // 正在绘制
      context.hoveredEntityID === line.id || // hover
      context.selectedIDs.includes(line.id) // 选中
    ) {
      // 线条置顶条件：正在绘制 / hover / 选中
      return StackingConfig.maxLevel + 1;
    }
    const fromLevel = NodeComputing.nodeStackingLevel(line.from, context, true);
    if (!line.to) {
      // 还处于连线中
      return fromLevel;
    }
    const toLevel = NodeComputing.nodeStackingLevel(line.to, context, true);
    const level = Math.min(fromLevel, toLevel);
    return level;
  };

  const lineZIndex = (line: WorkflowLineEntity, context: StackingContext): number | undefined => {
    const level = lineStackingLevel(line, context);
    const zIndex = NodeComputing.stackingIndex(StackingType.Line, level);
    return zIndex;
  };
}

export const layersComputing = (params: {
  nodes: WorkflowNodeEntity[];
  lines: WorkflowLineEntity[];
  context: StackingContext;
}) => {
  const { nodes, lines, context } = params;
  nodes.forEach((node) => {
    NodeComputing.compute(node, context);
  });
  lines.forEach((line) => {
    LineComputing.compute(line, context);
  });
};
