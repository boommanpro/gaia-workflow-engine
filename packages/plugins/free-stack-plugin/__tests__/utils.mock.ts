/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';
import {
  WorkflowJSON,
  WorkflowDocumentContainerModule,
  // WorkflowLinesManager,
} from '@flowgram.ai/free-layout-core';
import { FlowDocumentContainerModule } from '@flowgram.ai/document';
import { PlaygroundMockTools } from '@flowgram.ai/core';

export function createWorkflowContainer(): interfaces.Container {
  const container = PlaygroundMockTools.createContainer([
    FlowDocumentContainerModule,
    WorkflowDocumentContainerModule,
  ]);
  // const linesManager = container.get(WorkflowLinesManager);
  // linesManager.registerContribution(WorkflowSimpleLineContribution);
  // linesManager.switchLineType(WorkflowSimpleLineContribution.type);
  return container;
}

export const workflowJSON: WorkflowJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: { x: 0, y: 0 },
        testRun: {
          showError: undefined,
        },
      },
      data: undefined,
    },
    {
      id: 'condition_0',
      type: 'condition',
      meta: {
        position: { x: 400, y: 0 },
        testRun: {
          showError: undefined,
        },
      },
      data: undefined,
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: { x: 800, y: 0 },
        testRun: {
          showError: undefined,
        },
      },
      data: undefined,
    },
    {
      id: 'loop_0',
      type: 'loop',
      meta: {
        position: { x: 1200, y: 0 },
        testRun: {
          showError: undefined,
        },
      },
      data: undefined,
      blocks: [
        {
          id: 'break_0',
          type: 'break',
          meta: {
            position: { x: 0, y: 0 },
            testRun: {
              showError: undefined,
            },
          },
          data: undefined,
        },
        {
          id: 'variable_0',
          type: 'variable',
          meta: {
            position: { x: 400, y: 0 },
            testRun: {
              showError: undefined,
            },
          },
          data: undefined,
        },
      ],
      edges: [
        {
          sourceNodeID: 'break_0',
          targetNodeID: 'variable_0',
        },
      ],
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'condition_0',
    },
    {
      sourceNodeID: 'condition_0',
      sourcePortID: 'if',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'condition_0',
      sourcePortID: 'else',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'loop_0',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'loop_0',
    },
  ],
};
