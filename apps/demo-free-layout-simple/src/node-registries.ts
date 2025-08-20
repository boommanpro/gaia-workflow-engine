/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeRegistry } from '@flowgram.ai/free-layout-editor';

/**
 * You can customize your own node registry
 * 你可以自定义节点的注册器
 */
export const nodeRegistries: WorkflowNodeRegistry[] = [
  {
    type: 'start',
    meta: {
      isStart: true, // Mark as start
      deleteDisable: true, // The start node cannot be deleted
      copyDisable: true, // The start node cannot be copied
      defaultPorts: [{ type: 'output' }], // Used to define the input and output ports, the start node only has the output port
    },
  },
  {
    type: 'condition',
    meta: {
      defaultPorts: [{ type: 'input' }],
      useDynamicPort: true,
    },
  },
  {
    type: 'chain',
    meta: {
      defaultPorts: [
        { type: 'input' },
        { type: 'output' },
        { portID: 'p4', location: 'bottom', offset: { x: -10, y: 0 }, type: 'output' },
        { portID: 'p5', location: 'bottom', offset: { x: 10, y: 0 }, type: 'output' },
      ],
    },
  },
  {
    type: 'tool',
    meta: {
      defaultPorts: [{ location: 'top', type: 'input' }],
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
    defaultPorts: [{ type: 'output' }, { type: 'input' }], // A normal node has two ports
  },
];
