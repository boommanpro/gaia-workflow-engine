/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeRegistry } from '@flowgram.ai/free-layout-editor';

export const nodeRegistries: WorkflowNodeRegistry[] = [
  {
    type: 'start',
    meta: {
      isStart: true,
      deleteDisable: true,
      copyDisable: true,
      defaultPorts: [{ type: 'output' }],
    },
  },
  {
    type: 'end',
    meta: {
      deleteDisable: true,
      copyDisable: true,
      defaultPorts: [{ type: 'input' }],
    },
  },
  {
    type: 'custom',
    meta: {},
    defaultPorts: [{ type: 'output' }, { type: 'input' }],
  },
];
