/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import {
  FlowNodeRenderData,
  FlowNodeTransformData,
  usePlayground,
  type CollapseProps,
} from '@flowgram.ai/fixed-layout-editor';

import { Arrow } from '../../assets';
import { Container } from './styles';

function Collapse(props: CollapseProps): JSX.Element {
  const { collapseNode, activateNode, hoverActivated, style } = props;
  const playground = usePlayground();

  const activateData = activateNode?.getData(FlowNodeRenderData);
  const transform = collapseNode.getData(FlowNodeTransformData)!;

  if (!transform) {
    return <></>;
  }

  const scrollToActivateNode = () => {
    setTimeout(() => {
      playground.config.scrollToView({
        position: activateNode?.getData(FlowNodeTransformData)?.outputPoint,
        scrollToCenter: true,
      });
    }, 100);
  };

  const collapseBlock = () => {
    transform.collapsed = true;
    activateData?.toggleMouseLeave();

    scrollToActivateNode();
  };

  const openBlock = () => {
    transform.collapsed = false;

    scrollToActivateNode();
  };

  // expand
  if (transform.collapsed) {
    const childCount = collapseNode.allCollapsedChildren.filter(
      (child) => !child.hidden && child !== activateNode
    ).length;

    return (
      <Container
        onClick={openBlock}
        hoverActivated={hoverActivated}
        aria-hidden="true"
        style={style}
      >
        {childCount}
      </Container>
    );
  }

  // dark: var(--semi-color-black)
  // light: var(--semi-color-white)
  const circleColor = 'var(--semi-color-white)';
  const color = hoverActivated ? '#82A7FC' : '#BBBFC4';

  // collapse
  return (
    <Container
      onClick={collapseBlock}
      hoverActivated={hoverActivated}
      isVertical={activateNode?.isVertical}
      isCollapse={true}
      style={style}
      aria-hidden="true"
    >
      <Arrow color={color} circleColor={circleColor} />
    </Container>
  );
}

export default Collapse;
