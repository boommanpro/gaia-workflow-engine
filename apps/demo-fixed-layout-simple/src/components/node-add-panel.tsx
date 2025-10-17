/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { nanoid } from 'nanoid';
import { useStartDragNode } from '@flowgram.ai/fixed-layout-editor';

import { nodeRegistries } from '../node-registries';
import { useAddNode } from '../hooks/use-add-node';

export const NodeAddPanel: React.FC = (props) => {
  const { startDrag } = useStartDragNode();
  const { handleAdd, handleAddBranch } = useAddNode();

  return (
    <div className="demo-fixed-sidebar">
      {nodeRegistries.map((registry) => {
        const nodeType = registry.type;
        return (
          <div
            key={nodeType}
            className="demo-fixed-card"
            onMouseDown={(e) => {
              e.stopPropagation();
              const nodeAddData = registry.onAdd();
              return startDrag(
                e,
                {
                  dragJSON: nodeAddData,
                  onCreateNode: async (json, dropNode) => handleAdd(json, dropNode),
                },
                {
                  disableDragScroll: true,
                }
              );
            }}
          >
            {nodeType}
          </div>
        );
      })}
      <div
        key={'branch'}
        className="demo-fixed-card"
        onMouseDown={(e) => {
          e.stopPropagation();
          return startDrag(
            e,
            {
              dragJSON: {
                id: `branch_${nanoid(5)}`,
                type: 'block',
                data: {
                  title: 'New Branch',
                  content: '',
                },
              },
              isBranch: true,
              onCreateNode: async (json, dropNode) => handleAddBranch(json, dropNode),
            },
            {
              disableDragScroll: true,
            }
          );
        }}
      >
        branch
      </div>
    </div>
  );
};
