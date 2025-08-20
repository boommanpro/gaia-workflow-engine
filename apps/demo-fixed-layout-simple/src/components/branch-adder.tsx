/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { type FlowNodeEntity, useClientContext } from '@flowgram.ai/fixed-layout-editor';
import { IconPlus } from '@douyinfe/semi-icons';

interface PropsType {
  activated?: boolean;
  node: FlowNodeEntity;
}

export function BranchAdder(props: PropsType) {
  const { activated, node } = props;
  const nodeData = node.firstChild!.renderData;
  const ctx = useClientContext();
  const { operation, playground } = ctx;
  const { isVertical } = node;

  function addBranch() {
    let block: FlowNodeEntity;
    if (node.flowNodeType === 'multiOutputs') {
      block = operation.addBlock(node, {
        id: `output_${nanoid(5)}`,
        type: 'output',
        data: {
          title: 'New Ouput',
          content: '',
        },
      });
    } else if (node.flowNodeType === 'multiInputs') {
      block = operation.addBlock(node, {
        id: `input_${nanoid(5)}`,
        type: 'input',
        data: {
          title: 'New Input',
          content: '',
        },
      });
    } else {
      block = operation.addBlock(node, {
        id: `branch_${nanoid(5)}`,
        type: 'block',
        data: {
          title: 'New Branch',
          content: '',
        },
      });
    }

    setTimeout(() => {
      playground.scrollToView({
        bounds: block.bounds,
        scrollToCenter: true,
      });
    }, 10);
  }

  if (playground.config.readonlyOrDisabled) return null;

  const className = [
    'demo-fixed-adder',
    isVertical ? '' : 'isHorizontal',
    activated ? 'activated' : '',
  ].join(' ');

  return (
    <div
      className={className}
      onMouseEnter={() => nodeData?.toggleMouseEnter()}
      onMouseLeave={() => nodeData?.toggleMouseLeave()}
    >
      <div
        onClick={() => {
          addBranch();
        }}
        aria-hidden="true"
        style={{ flexGrow: 1, textAlign: 'center' }}
      >
        <IconPlus />
      </div>
    </div>
  );
}
