/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';

import { nanoid } from 'nanoid';
import {
  type FlowNodeEntity,
  FlowNodeTransformData,
  usePlayground,
  useService,
  FlowOperationService,
} from '@flowgram.ai/fixed-layout-editor';
import { Popover } from '@douyinfe/semi-ui';

import Nodes from '../nodes';
import { AdderWrap, IconPlus } from './styles';

export default function Adder(props: {
  from: FlowNodeEntity;
  to?: FlowNodeEntity;
  hoverActivated: boolean;
}) {
  const { from } = props;
  const [visible, setVisible] = useState(false);
  const playground = usePlayground();
  const flowOperationService = useService(FlowOperationService) as FlowOperationService;

  const add = (addProps: any) => {
    const block = flowOperationService.addFromNode(from, {
      id: addProps.type + nanoid(5),
      type: addProps.type,
      blocks: addProps.blocks ? addProps.blocks() : undefined,
    });
    setTimeout(() => {
      playground.scrollToView({
        bounds: block.getData<FlowNodeTransformData>(FlowNodeTransformData)!.bounds,
        scrollToCenter: true,
      });
    }, 10);
  };

  if (playground.config.readonlyOrDisabled) return null;

  return (
    <Popover
      visible={visible}
      onVisibleChange={setVisible}
      content={<Nodes onSelect={add} />}
      placement="right"
      trigger="click"
      overlayStyle={{
        padding: 0,
      }}
    >
      <AdderWrap
        hovered={props.hoverActivated}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => {
          setVisible(true);
        }}
      >
        {props.hoverActivated ? <IconPlus /> : null}
      </AdderWrap>
    </Popover>
  );
}
