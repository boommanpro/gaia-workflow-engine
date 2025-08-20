'use client';

import { FlowNodeRegistry } from '@editor/typings';
import { StartNodeRegistry } from '@editor/nodes/start';
import { LoopNodeRegistry } from '@editor/nodes/loop';
import { LLMNodeRegistry } from '@editor/nodes/llm';
import { EndNodeRegistry } from '@editor/nodes/end';
import { ConditionNodeRegistry } from '@editor/nodes/condition';
import { CommentNodeRegistry } from '@editor/nodes/comment';

/**
 * You can customize your own node registry
 * 你可以自定义节点的注册器
 */
export const nodeRegistries: FlowNodeRegistry[] = [
  ConditionNodeRegistry,
  StartNodeRegistry,
  EndNodeRegistry,
  LLMNodeRegistry,
  LoopNodeRegistry,
  CommentNodeRegistry,
  {
    type: 'start2',
    meta: {
      isStart: true, // Mark as start
      deleteDisable: true, // The start node cannot be deleted
      copyDisable: true, // The start node cannot be copied
      defaultPorts: [{ type: 'output' }], // Used to define the input and output ports, the start node only has the output port
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
