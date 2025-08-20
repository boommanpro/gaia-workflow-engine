/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowJSON } from '@flowgram.ai/free-layout-core';

export const mockJSON: WorkflowJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 381.75,
        },
      },
      data: {
        title: 'Start',
      },
    },
    {
      id: 'condition_0',
      type: 'condition',
      meta: {
        position: {
          x: 640,
          y: 363.25,
        },
      },
      data: {
        title: 'Condition',
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 2220,
          y: 381.75,
        },
      },
      data: {
        title: 'End',
      },
    },
    {
      id: 'loop_H8M3U',
      type: 'loop',
      meta: {
        position: {
          x: 1020,
          y: 547.96875,
        },
      },
      data: {
        title: 'Loop_2',
      },
      blocks: [
        {
          id: 'llm_CBdCg',
          type: 'llm',
          meta: {
            position: {
              x: 180,
              y: 0,
            },
          },
          data: {
            title: 'LLM_4',
          },
        },
        {
          id: 'llm_gZafu',
          type: 'llm',
          meta: {
            position: {
              x: 640,
              y: 0,
            },
          },
          data: {
            title: 'LLM_5',
          },
        },
      ],
      edges: [
        {
          sourceNodeID: 'llm_CBdCg',
          targetNodeID: 'llm_gZafu',
        },
      ],
    },
    {
      id: '159623',
      type: 'comment',
      meta: {
        position: {
          x: 640,
          y: 522.46875,
        },
      },
      data: {
        size: {
          width: 240,
          height: 150,
        },
        note: 'hi ~\n\nthis is a comment node\n\n- flowgram.ai',
      },
    },
    {
      id: 'group_V-_st',
      type: 'group',
      meta: {
        position: {
          x: 1020,
          y: 96.25,
        },
      },
      data: {
        title: 'LLM_Group',
        color: 'Violet',
        parentID: 'root',
        blockIDs: ['llm_0', 'llm_l_TcE'],
      },
    },
    {
      id: 'llm_0',
      type: 'llm',
      meta: {
        position: {
          x: 640,
          y: 0,
        },
      },
      data: {
        title: 'LLM_0',
      },
    },
    {
      id: 'llm_l_TcE',
      type: 'llm',
      meta: {
        position: {
          x: 180,
          y: 0,
        },
      },
      data: {
        title: 'LLM_1',
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'condition_0',
    },
    {
      sourceNodeID: 'condition_0',
      targetNodeID: 'llm_l_TcE',
      sourcePortID: 'if_0',
    },
    {
      sourceNodeID: 'condition_0',
      targetNodeID: 'loop_H8M3U',
      sourcePortID: 'if_f0rOAt',
    },
    {
      sourceNodeID: 'llm_0',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'loop_H8M3U',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'llm_l_TcE',
      targetNodeID: 'llm_0',
    },
  ],
};

export const mockJSON2: WorkflowJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 0,
          y: 0,
        },
      },
      data: {
        title: 'Start changed',
      },
    },
    {
      id: 'condition_0',
      type: 'condition',
      meta: {
        position: {
          x: 235.74542284219706,
          y: -157.7680906713165,
        },
      },
      data: {
        title: 'Condition changed',
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 310.0959023539669,
          y: 190.25,
        },
      },
      data: {
        title: 'End',
      },
    },
    {
      id: 'loop_H8M3U',
      type: 'loop',
      meta: {
        position: {
          x: 1020,
          y: 547.96875,
        },
      },
      data: {
        title: 'Loop_2 changed',
      },
      blocks: [
        {
          id: 'llm_CBdCg',
          type: 'llm',
          meta: {
            position: {
              x: 180,
              y: 0,
            },
          },
          data: {
            title: 'LLM_4 chnaged',
          },
        },
        {
          id: 'llm_gZafu',
          type: 'llm changed',
          meta: {
            position: {
              x: 9.626852659110725,
              y: 121.49956408020925,
            },
          },
          data: {
            title: 'LLM_5',
          },
        },
      ],
      edges: [
        {
          sourceNodeID: 'llm_CBdCg',
          targetNodeID: 'llm_gZafu',
        },
      ],
    },
    {
      id: '159623',
      type: 'comment',
      meta: {
        position: {
          x: 300,
          y: 486.2002234088928,
        },
      },
      data: {
        size: {
          width: 240,
          height: 150,
        },
        note: 'hi ~\n\nthis is a comment node changed\n\n- flowgram.ai',
      },
    },
    {
      id: 'group_V-_st',
      type: 'group',
      meta: {
        position: {
          x: 869.4856146469051,
          y: 56.4254577157803,
        },
      },
      data: {
        title: 'LLM_Group changed',
        color: 'Violet',
        parentID: 'root',
        blockIDs: ['llm_0', 'llm_l_TcE'],
      },
    },
    {
      id: 'llm_0',
      type: 'llm',
      meta: {
        position: {
          x: 640,
          y: 0,
        },
      },
      data: {
        title: 'LLM_0 changed',
      },
    },
    {
      id: 'llm_l_TcE',
      type: 'llm',
      meta: {
        position: {
          x: 180,
          y: 0,
        },
      },
      data: {
        title: 'LLM_1',
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'condition_0',
    },
    {
      sourceNodeID: 'condition_0',
      targetNodeID: 'llm_l_TcE',
      sourcePortID: 'if_0',
    },
    {
      sourceNodeID: 'condition_0',
      targetNodeID: 'loop_H8M3U',
      sourcePortID: 'if_f0rOAt',
    },
    {
      sourceNodeID: 'llm_0',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'loop_H8M3U',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'llm_l_TcE',
      targetNodeID: 'llm_0',
    },
  ],
};
export const mockSimpleJSON: WorkflowJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: { x: 0, y: 0 },
      },
      data: {
        title: 'start',
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: { x: 800, y: 0 },
      },
      data: {
        title: 'end',
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'end_0',
    },
  ],
};

export const mockSimpleJSON2: WorkflowJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: { x: 1, y: 1 },
      },
      data: {
        title: 'start changed',
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: { x: 801, y: 1 },
      },
      data: {
        title: 'end changed',
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'end_0',
    },
  ],
};
