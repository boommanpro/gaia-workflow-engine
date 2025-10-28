import { WorkflowJSON } from '@flowgram.ai/free-layout-editor';

export const initialData: WorkflowJSON = {
  nodes: [
    {
      id: '1',
      type: 'custom',
      meta: {
        position: { x: 0, y: 0 },
      },
    },
    {
      id: '2',
      type: 'custom',
      meta: {
        position: { x: 400, y: -200 },
      },
    },
    {
      id: '3',
      type: 'custom',
      meta: {
        position: { x: 400, y: 0 },
      },
    },
    {
      id: '4',
      type: 'custom',
      meta: {
        position: { x: 400, y: 200 },
      },
    },
    {
      id: '5',
      type: 'custom',
      meta: {
        position: { x: 800, y: 0 },
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
