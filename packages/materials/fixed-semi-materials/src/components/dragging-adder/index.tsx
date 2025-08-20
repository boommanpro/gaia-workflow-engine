/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { FlowDragLayer, usePlayground } from '@flowgram.ai/fixed-layout-editor';

import { UIDragNodeContainer } from './styles';

export default function DraggingAdder(props: any): JSX.Element {
  const playground = usePlayground();
  const layer = playground.getLayer(FlowDragLayer);
  if (!layer) return <></>;
  if (
    layer.options.canDrop &&
    !layer.options.canDrop({
      dragNodes: layer.dragEntities || [],
      dropNode: props.from,
      isBranch: false,
    })
  ) {
    return <></>;
  }
  return <UIDragNodeContainer />;
}
