/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import {
  type AdderProps,
  type FlowNodeTransitionData,
  type LABEL_SIDE_TYPE,
  FlowDragService,
} from '@flowgram.ai/document';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { useService } from '@flowgram.ai/core';

import { FlowRendererKey, type FlowRendererRegistry } from '../flow-renderer-registry';

interface PropsType {
  data: FlowNodeTransitionData;
  rendererRegistry: FlowRendererRegistry;
  hoverHeight?: number;
  side?: LABEL_SIDE_TYPE;
  // 业务自定义 props
  [key: string]: unknown;
}

const getFlowRenderKey = (
  node: FlowNodeEntity,
  { dragService, side }: { dragService: FlowDragService; side?: LABEL_SIDE_TYPE },
) => {
  if (
    dragService.isDragBranch &&
    side &&
    dragService.labelSide === side &&
    dragService.isDroppableBranch(node, side)
  ) {
    if (dragService.dropNodeId === node.id) {
      // 元素拖拽区域激活
      return FlowRendererKey.DRAG_BRANCH_HIGHLIGHT_ADDER;
    }
    // 节点元素拖拽，展示可被拖入区域为添加节点位置
    return FlowRendererKey.DRAGGABLE_ADDER;
  }

  // 默认不展示
  return '';
};

/**
 * 分支可被拖拽进入区域样式渲染
 */
export default function BranchDraggableRenderer(props: PropsType) {
  const { data, rendererRegistry, side, ...restProps } = props;

  const node = data.entity;

  const dragService = useService<FlowDragService>(FlowDragService);

  const flowRenderKey = getFlowRenderKey(node, { side, dragService });

  if (!flowRenderKey) {
    return null;
  }
  const adder = rendererRegistry.getRendererComponent(flowRenderKey);
  const from = node;
  // 获取 originTree 的 to 节点
  const to = data.entity.document.renderTree.getOriginInfo(node).next;
  // 实际渲染的 to 节点
  const renderTo = node.next;

  const child = React.createElement(
    adder.renderer as (props: AdderProps) => JSX.Element,
    {
      node,
      from,
      to,
      renderTo,
      ...restProps,
    } as AdderProps,
  );

  return <div className="flow-canvas-branch-draggable-adder">{child}</div>;
}
