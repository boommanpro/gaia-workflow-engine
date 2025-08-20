/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useCallback } from 'react';

import {
  type CollapseAdderProps,
  FlowNodeRenderData,
  type FlowNodeTransitionData,
} from '@flowgram.ai/document';

import { type FlowRendererRegistry } from '../flow-renderer-registry';
import Collapse from './Collapse';
import Adder from './Adder';

interface PropsType extends Partial<CollapseAdderProps> {
  data: FlowNodeTransitionData;
  rendererRegistry: FlowRendererRegistry;
  // 业务自定义 props
  [key: string]: unknown;
}

/**
 * 加号和收起复合 Label
 * @param props
 * @returns
 */
export default function CollapseAdder(props: PropsType) {
  const { data, rendererRegistry, ...restProps } = props;
  const { activateNode } = restProps;

  // 收起展开按钮是否可见
  const [hoverActivated, setHoverActivated] = useState(false);

  const activateData = activateNode?.getData(FlowNodeRenderData);

  const handleMouseEnter = useCallback(() => {
    setHoverActivated(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverActivated(false);
  }, []);

  const isVertical = activateNode?.isVertical;
  const activated = activateData?.hovered || hoverActivated;
  if (isVertical) {
    return (
      <div
        className="flow-canvas-collapse-adder"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {(activated || data.collapsed) && (
          <Collapse
            forceVisible
            {...props}
            wrapperStyle={{
              alignItems: 'flex-end',
            }}
            hoverHeight={20}
          />
        )}
        {!data.collapsed && (
          <Adder {...props} hoverHeight={activated ? 20 : 40} hoverActivated={activated} />
        )}
      </div>
    );
  }

  return (
    <div
      className="flow-canvas-collapse-adder"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: data.collapsed ? 'block' : 'flex',
      }}
    >
      {(activated || data.collapsed) && (
        <Collapse
          forceVisible
          {...props}
          wrapperStyle={{
            justifyContent: 'flex-end',
          }}
          hoverWidth={20}
        />
      )}
      {!data.collapsed && (
        <Adder {...props} hoverWidth={activated ? 20 : 40} hoverActivated={activated} />
      )}
    </div>
  );
}
