/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { min } from 'lodash-es';
import { type FlowNodeEntity, FlowNodeTransformData } from '@flowgram.ai/fixed-layout-editor';

import { Ellipse } from '../../assets';
import { UILineContainer, UILine } from './styles';

const getMinSize = (preWidth: number, nextWidth: number): number => {
  if (!preWidth || preWidth < 0) {
    return 0;
  }
  if (!nextWidth || nextWidth < 0) {
    return preWidth;
  }
  return min([preWidth, nextWidth]) || 0;
};

export default function DragHighlightAdder({ node }: { node: FlowNodeEntity }): JSX.Element {
  const transformBounds = node.getData<FlowNodeTransformData>(FlowNodeTransformData)?.bounds;
  const { isVertical } = node;
  if (isVertical) {
    const preWidth = (transformBounds?.width || 0) - 16;
    const nextNodeBounds =
      node?.next?.getData<FlowNodeTransformData>(FlowNodeTransformData)?.bounds?.width;
    const nextWidth = (nextNodeBounds || 0) - 16;
    const LineDom = UILine(getMinSize(preWidth, nextWidth), 2);
    return (
      <UILineContainer>
        <Ellipse />
        <LineDom />
        <Ellipse />
      </UILineContainer>
    );
  }
  const preHeight = (transformBounds?.height || 0) - 16;
  const nextNodeBounds =
    node?.next?.getData<FlowNodeTransformData>(FlowNodeTransformData)?.bounds?.height;
  const nextHeight = (nextNodeBounds || 0) - 16;
  const LineDom = UILine(2, getMinSize(preHeight, nextHeight));
  return (
    <UILineContainer style={{ flexDirection: 'column' }}>
      <Ellipse />
      <LineDom />
      <Ellipse />
    </UILineContainer>
  );
}
