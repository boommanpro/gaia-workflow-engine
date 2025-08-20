/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useCallback } from 'react';

import {
  type CollapseProps,
  FlowNodeRenderData,
  type FlowNodeTransitionData,
} from '@flowgram.ai/document';

import { FlowRendererKey, type FlowRendererRegistry } from '../flow-renderer-registry';
import { getTransitionLabelHoverHeight, getTransitionLabelHoverWidth } from './utils';

interface PropsType extends Partial<CollapseProps> {
  data: FlowNodeTransitionData;
  rendererRegistry: FlowRendererRegistry;
  hoverHeight?: number;
  hoverWidth?: number;
  wrapperStyle?: React.CSSProperties;
  // 业务自定义 props
  [key: string]: unknown;
}

export default function Collapse(props: PropsType) {
  const {
    data,
    rendererRegistry,
    forceVisible,
    hoverHeight = getTransitionLabelHoverHeight(data),
    hoverWidth = getTransitionLabelHoverWidth(data),
    wrapperStyle,
    ...restProps
  } = props;
  const { activateNode } = restProps;

  const [hoverActivated, setHoverActivated] = useState(false);
  const activateData = activateNode?.getData(FlowNodeRenderData);

  const handleMouseEnter = useCallback(() => {
    setHoverActivated(true);
    activateData?.toggleMouseEnter();
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverActivated(false);
    activateData?.toggleMouseLeave();
  }, []);

  const collapseOpener = rendererRegistry.getRendererComponent(FlowRendererKey.COLLAPSE);
  const node = data.entity;

  const child = React.createElement(
    collapseOpener.renderer as (props: CollapseProps) => JSX.Element,
    {
      node,
      collapseNode: node,
      ...restProps,
      hoverActivated,
    } as CollapseProps,
  );

  const isChildVisible = data.collapsed || activateData?.hovered || hoverActivated || forceVisible;

  return (
    <div
      className="flow-canvas-collapse"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: hoverWidth,
        height: hoverHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...wrapperStyle,
      }}
    >
      {isChildVisible ? child : null}
    </div>
  );
}
