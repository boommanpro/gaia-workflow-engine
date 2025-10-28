/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import '@flowgram.ai/fixed-layout-editor/index.css';

import { FC } from 'react';

import {
  FlowNodeEntity,
  FlowNodeJSON,
  FlowOperationService,
  usePlayground,
  useService,
} from '@flowgram.ai/fixed-layout-editor';

const useAddNode = () => {
  const playground = usePlayground();
  const flowOperationService = useService(FlowOperationService) as FlowOperationService;

  const handleAdd = (addProps: FlowNodeJSON, dropNode: FlowNodeEntity) => {
    const blocks = addProps.blocks ? addProps.blocks : undefined;
    const entity = flowOperationService.addFromNode(dropNode, {
      ...addProps,
      blocks,
    });
    setTimeout(() => {
      playground.scrollToView({
        bounds: entity.bounds,
        scrollToCenter: true,
      });
    }, 10);
    return entity;
  };

  const handleAddBranch = (addProps: FlowNodeJSON, dropNode: FlowNodeEntity) => {
    const index = dropNode.index + 1;
    const entity = flowOperationService.addBlock(dropNode.originParent!, addProps, {
      index,
    });
    return entity;
  };

  return {
    handleAdd,
    handleAddBranch,
  };
};

export const Adder: FC<{
  from: FlowNodeEntity;
  to?: FlowNodeEntity;
  hoverActivated: boolean;
}> = ({ from, hoverActivated }) => {
  const playground = usePlayground();

  const { handleAdd } = useAddNode();

  if (playground.config.readonlyOrDisabled) return null;

  return (
    <div
      style={{
        width: hoverActivated ? 15 : 6,
        height: hoverActivated ? 15 : 6,
        backgroundColor: hoverActivated ? '#fff' : 'rgb(143, 149, 158)',
        color: '#fff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={() => {
        handleAdd(
          {
            type: 'custom',
            id: `custom_${Date.now()}`,
            data: {
              title: 'New Custom Node',
              content: 'Custom Node Content',
            },
          },
          from
        );
      }}
    >
      {hoverActivated ? (
        <span
          style={{
            color: '#3370ff',
            fontSize: 12,
          }}
        >
          +
        </span>
      ) : null}
    </div>
  );
};
