/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useState } from 'react';

import {
  type AdderProps,
  type FlowNodeTransitionData,
  type FlowNodeEntity,
  FlowDragService,
} from '@flowgram.ai/document';
import { useService } from '@flowgram.ai/core';

import { FlowRendererKey, type FlowRendererRegistry } from '../flow-renderer-registry';
import { getTransitionLabelHoverHeight, getTransitionLabelHoverWidth } from './utils';

interface PropsType {
  data: FlowNodeTransitionData;
  rendererRegistry: FlowRendererRegistry;
  hoverWidth?: number;
  hoverHeight?: number;
  // 业务自定义 props
  [key: string]: unknown;
}

// export only for tests
export const getFlowRenderKey = (
  node: FlowNodeEntity,
  { dragService }: { dragService?: FlowDragService },
) => {
  if (dragService && dragService.dragging && dragService.isDroppableNode(node)) {
    if (dragService.dropNodeId === node.id) {
      return FlowRendererKey.DRAG_HIGHLIGHT_ADDER;
    }
    return FlowRendererKey.DRAGGABLE_ADDER;
  }

  return FlowRendererKey.ADDER;
};

/**
 * Adder 高亮热区扩散目的：
 * ux 调研的时候不少用户反馈点看的不是很清楚（初始点较小）
 * 因此给的解决办法是加深加大 icon  再加扩大 hover 热区
 *
 * Adder 模块高亮规则：
 * 取前后节点宽度的最大值为高亮区域宽度
 * 高度固定为 32px
 */
export default function Adder(props: PropsType) {
  const {
    data,
    rendererRegistry,
    hoverHeight = getTransitionLabelHoverHeight(data),
    hoverWidth = getTransitionLabelHoverWidth(data),
    ...restProps
  } = props;

  const [hoverActivated, setHoverActivated] = useState(false);

  const handleMouseEnter = useCallback(() => setHoverActivated(true), []);
  const handleMouseLeave = useCallback(() => setHoverActivated(false), []);

  const node = data.entity;

  const dragService = useService<FlowDragService>(FlowDragService);

  // 根据拖拽条件转换状态
  const flowRenderKey = getFlowRenderKey(node, { dragService });

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
      hoverActivated,
      setHoverActivated,
      hoverWidth,
      hoverHeight,
      ...restProps,
    } as AdderProps,
  );

  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <div
      className="flow-canvas-adder"
      data-testid="sdk.flowcanvas.line.adder"
      data-from={from.id}
      data-to={to?.id ?? ''}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: hoverWidth,
        height: hoverHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {child}
    </div>
  );
}
