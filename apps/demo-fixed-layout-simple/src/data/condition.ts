/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocumentJSON } from '@flowgram.ai/fixed-layout-editor';

export const condition: FlowDocumentJSON = {
  nodes: [
    // 开始节点
    {
      id: 'start_0',
      type: 'start',
      data: {
        title: 'Start',
        content: 'start content',
      },
      blocks: [],
    },
    // 分支节点
    {
      id: 'condition_0',
      type: 'condition',
      data: {
        title: 'Condition',
        content: 'condition content',
      },
      blocks: [
        {
          id: 'branch_0',
          type: 'block',
          data: {
            title: 'Branch 0',
            content: 'branch 1 content',
          },
          blocks: [
            {
              id: 'custom_0',
              type: 'custom',
              data: {
                title: 'Custom',
                content: 'custom content',
              },
            },
          ],
        },
        {
          id: 'branch_1',
          type: 'block',
          data: {
            title: 'Branch 1',
            content: 'branch 1 content',
          },
          blocks: [
            {
              id: 'break_0',
              type: 'break',
              data: {
                title: 'Break',
                content: 'Break content',
              },
            },
          ],
        },
        {
          id: 'branch_2',
          type: 'block',
          data: {
            title: 'Branch 2',
            content: 'branch 2 content',
          },
          blocks: [],
        },
      ],
    },
    // 结束节点
    {
      id: 'end_0',
      type: 'end',
      data: {
        title: 'End',
        content: 'end content',
      },
    },
  ],
};
