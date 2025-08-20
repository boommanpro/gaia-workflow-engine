/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { runFixedLayoutTest } from '../__mocks__/run-fixed-layout-test';

runFixedLayoutTest(
  'Variable Fix Layout Group',
  {
    nodes: [
      {
        id: 'start_0',
        type: 'start',
        meta: {
          isStart: true,
        },
        blocks: [],
      },
      {
        id: '$group_test$',
        type: 'block',
        blocks: [
          {
            id: 'node_0',
            type: 'noop',
            blocks: [],
          },
          {
            id: 'node_1',
            type: 'noop',
            blocks: [],
          },
        ],
      },
      {
        id: 'end_0',
        type: 'end',
        blocks: [],
      },
    ],
  },
  {}
);
