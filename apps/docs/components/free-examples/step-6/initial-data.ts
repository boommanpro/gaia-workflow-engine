import { WorkflowJSON } from '@flowgram.ai/free-layout-editor';

export const initialData: WorkflowJSON = {
  nodes: [
    {
      id: '1',
      type: 'start',
      meta: {
        position: { x: 0, y: 0 },
      },
      data: {
        title: 'Start Node',
      },
    },
    {
      id: '2',
      type: 'custom',
      meta: {
        position: { x: 400, y: -200 },
      },
      data: {
        title: 'Custom Node A',
      },
    },
    {
      id: '3',
      type: 'custom',
      meta: {
        position: { x: 400, y: 0 },
      },
      data: {
        title: 'Custom Node B',
      },
    },
    {
      id: '4',
      type: 'custom',
      meta: {
        position: { x: 400, y: 200 },
      },
      data: {
        title: 'Custom Node C',
      },
    },
    {
      id: '5',
      type: 'end',
      meta: {
        position: { x: 800, y: 0 },
      },
      data: {
        title: 'End Node',
      },
    },
  ],
  edges: [
    {
      sourceNodeID: '1',
      targetNodeID: '2',
    },
    {
      sourceNodeID: '1',
      targetNodeID: '3',
    },
    {
      sourceNodeID: '1',
      targetNodeID: '4',
    },
    {
      sourceNodeID: '2',
      targetNodeID: '5',
    },
    {
      sourceNodeID: '3',
      targetNodeID: '5',
    },
    {
      sourceNodeID: '4',
      targetNodeID: '5',
    },
  ],
};
