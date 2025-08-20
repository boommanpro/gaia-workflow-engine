/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { ContainerModule, interfaces } from 'inversify';
import {
  WorkflowBezierLineContribution,
  WorkflowFoldLineContribution,
} from '@flowgram.ai/free-lines-plugin';
import { AutoLayoutService } from '@flowgram.ai/free-auto-layout-plugin';

import { WorkflowAutoLayoutTool } from '../src/tools';
import {
  FlowDocumentContainerModule,
  FlowNodeBaseType,
  FreeLayoutProps,
  PlaygroundEntityContext,
  PlaygroundMockTools,
  PlaygroundReactProvider,
  WorkflowDocument,
  WorkflowDocumentContainerModule,
  WorkflowJSON,
  WorkflowLinesManager,
} from '../src';

const MockContainerModule = new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(AutoLayoutService).toSelf().inSingletonScope();
});

/**
 * 创建基本的 Container
 */
export function createWorkflowContainer(opts: FreeLayoutProps): interfaces.Container {
  const container = PlaygroundMockTools.createContainer([
    FlowDocumentContainerModule,
    WorkflowDocumentContainerModule,
    MockContainerModule,
  ]);
  container.bind(WorkflowAutoLayoutTool).toSelf().inSingletonScope();
  const linesManager = container.get(WorkflowLinesManager);
  linesManager
    .registerContribution(WorkflowBezierLineContribution)
    .registerContribution(WorkflowFoldLineContribution);
  return container;
}

export const baseJSON: WorkflowJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: { x: 0, y: 0 },
      },
      data: undefined,
    },
    {
      id: 'condition_0',
      type: 'condition',
      meta: {
        position: { x: 400, y: 0 },
      },
      data: undefined,
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: { x: 800, y: 0 },
      },
      data: undefined,
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
  ],
};

export const nestJSON: WorkflowJSON = {
  nodes: [
    ...baseJSON.nodes,
    {
      id: 'loop_0',
      type: 'loop',
      meta: {
        position: { x: 1200, y: 0 },
      },
      data: undefined,
      blocks: [
        {
          id: 'break_0',
          type: 'break',
          meta: {
            position: { x: 0, y: 0 },
          },
          data: undefined,
        },
        {
          id: 'variable_0',
          type: 'variable',
          meta: {
            position: { x: 400, y: 0 },
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
  edges: [...baseJSON.edges],
};

export async function createDocument(params?: {
  json: WorkflowJSON;
  opts: FreeLayoutProps;
}): Promise<{
  document: WorkflowDocument;
  container: interfaces.Container;
}> {
  const { json = baseJSON, opts = {} } = params || {};
  const container = createWorkflowContainer(opts);
  const document = container.get<WorkflowDocument>(WorkflowDocument);
  await document.fromJSON(json);
  return {
    document,
    container,
  };
}

export function createHookWrapper(
  container: interfaces.Container,
  entityId: string = 'start_0'
): any {
  // eslint-disable-next-line react/display-name
  return ({ children }: any) => (
    <PlaygroundReactProvider playgroundContainer={container}>
      <PlaygroundEntityContext.Provider value={container.get(WorkflowDocument).getNode(entityId)}>
        {children}
      </PlaygroundEntityContext.Provider>
    </PlaygroundReactProvider>
  );
}

export async function createSubCanvasNodes(document: WorkflowDocument) {
  await document.fromJSON({ nodes: [], edges: [] });
  const loopNode = await document.createWorkflowNode({
    id: 'loop_0',
    type: 'loop',
    meta: {
      position: { x: -100, y: 0 },
      subCanvas: () => {
        const parentNode = document.getNode('loop_0');
        const canvasNode = document.getNode('subCanvas_0');
        if (!parentNode || !canvasNode) {
          return;
        }
        return {
          isCanvas: false,
          parentNode,
          canvasNode,
        };
      },
    },
  });
  const subCanvasNode = await document.createWorkflowNode({
    id: 'subCanvas_0',
    type: FlowNodeBaseType.SUB_CANVAS,
    meta: {
      position: { x: 100, y: 0 },
      subCanvas: () => ({
        isCanvas: true,
        parentNode: document.getNode('loop_0')!,
        canvasNode: document.getNode('subCanvas_0')!,
      }),
    },
  });
  document.linesManager.createLine({
    from: loopNode.id,
    to: subCanvasNode.id,
  });
  const variableNode = await document.createWorkflowNode(
    {
      id: 'variable_0',
      type: 'variable',
      meta: {
        position: { x: 0, y: 0 },
      },
    },
    false,
    subCanvasNode.id
  );
  return {
    loopNode,
    subCanvasNode,
    variableNode,
  };
}
