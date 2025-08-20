/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { WorkflowDragService, useService } from '@flowgram.ai/free-layout-editor';

const cardkeys = ['Node1', 'Node2', 'Condition', 'Chain', 'Tool'];

export const NodeAddPanel: React.FC = (props) => {
  const startDragSerivce = useService<WorkflowDragService>(WorkflowDragService);

  return (
    <div className="demo-free-sidebar">
      {cardkeys.map((nodeType) => (
        <div
          key={nodeType}
          className="demo-free-card"
          onMouseDown={(e) =>
            startDragSerivce.startDragCard(nodeType.toLowerCase(), e, {
              data: {
                title: `New ${nodeType}`,
                content: 'xxxx',
              },
            })
          }
        >
          {nodeType}
        </div>
      ))}
    </div>
  );
};
