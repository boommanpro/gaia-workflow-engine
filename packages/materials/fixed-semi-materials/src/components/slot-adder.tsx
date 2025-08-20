/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { nanoid } from 'nanoid';
import {
  type FlowNodeEntity,
  FlowNodeRenderData,
  FlowDocument,
  useService,
} from '@flowgram.ai/fixed-layout-editor';
import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

interface PropsType {
  node: FlowNodeEntity;
}

export function SlotAdder(props: PropsType) {
  const { node } = props;

  const nodeData = node.firstChild?.getData<FlowNodeRenderData>(FlowNodeRenderData);
  const document = useService(FlowDocument) as FlowDocument;

  async function addPort() {
    document.addNode({
      id: nanoid(5),
      type: 'custom',
      parent: node,
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--semi-color-bg-0)',
      }}
      onMouseEnter={() => nodeData?.toggleMouseEnter()}
      onMouseLeave={() => nodeData?.toggleMouseLeave()}
    >
      <Button
        onClick={() => {
          addPort();
        }}
        size="small"
        icon={<IconPlus />}
      />
    </div>
  );
}
