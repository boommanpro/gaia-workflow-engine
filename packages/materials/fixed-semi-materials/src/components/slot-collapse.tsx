/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';

import {
  type FlowNodeEntity,
  FlowNodeRenderData,
  FlowNodeTransformData,
} from '@flowgram.ai/fixed-layout-editor';

import Collapse from './collapse';

export function SlotCollapse({ node }: { node: FlowNodeEntity }) {
  const [hoverActivated, setHoverActivated] = useState(false);

  const icon = node.firstChild!;
  const iconActivated = icon.getData(FlowNodeRenderData).activated;
  const iconHeight = icon.getData(FlowNodeTransformData).size.height;

  const isChildVisible = node.collapsed || hoverActivated || iconActivated;

  return (
    <div
      style={{
        width: 30,
        height: iconHeight || 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => setHoverActivated(true)}
      onMouseLeave={() => setHoverActivated(false)}
    >
      {isChildVisible && (
        <Collapse
          style={
            !node.collapsed
              ? {
                  transform: node.isVertical ? 'rotate(-90deg)' : 'rotate(90deg)',
                }
              : {}
          }
          node={node}
          activateNode={icon}
          collapseNode={node}
          hoverActivated={hoverActivated}
        />
      )}
    </div>
  );
}
