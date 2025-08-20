/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import type { FlowNodeEntity } from '@flowgram.ai/fixed-layout-editor';

import { UIDragNodeContainer, UIDragCounts } from './styles';

export interface PropsType {
  dragStart: FlowNodeEntity;
  dragNodes: FlowNodeEntity[];
}

export default function DragNode(props: PropsType): JSX.Element {
  const { dragStart, dragNodes } = props;

  const dragLength = (dragNodes || [])
    .map((_node) =>
      _node.allCollapsedChildren.length
        ? _node.allCollapsedChildren.filter((_n) => !_n.hidden).length
        : 1
    )
    .reduce((acm, curr) => acm + curr, 0);

  return (
    <UIDragNodeContainer>
      {dragStart?.id}
      {dragLength > 1 && (
        <>
          <UIDragCounts>{dragLength}</UIDragCounts>
          <UIDragNodeContainer
            style={{
              position: 'absolute',
              top: 5,
              right: -5,
              left: 5,
              bottom: -5,
              opacity: 0.5,
            }}
          />
        </>
      )}
    </UIDragNodeContainer>
  );
}
