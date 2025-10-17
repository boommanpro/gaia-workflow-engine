/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const globalVariableSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 22.5,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 640,
          y: 0,
        },
      },
      data: {
        title: 'End',
        inputsValues: {
          g_str: {
            type: 'ref',
            content: ['global', 'str'],
          },
          g_num: {
            type: 'ref',
            content: ['global', 'num'],
          },
          g_int: {
            type: 'ref',
            content: ['global', 'int'],
          },
          g_bool: {
            type: 'ref',
            content: ['global', 'bool'],
          },
          g_obj: {
            type: 'ref',
            content: ['global', 'obj'],
          },
          g_arr_str: {
            type: 'ref',
            content: ['global', 'arr_str'],
          },
          g_map: {
            type: 'ref',
            content: ['global', 'map'],
          },
          g_date: {
            type: 'ref',
            content: ['global', 'date'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            g_str: {
              type: 'string',
            },
            g_num: {
              type: 'number',
            },
            g_int: {
              type: 'integer',
            },
            g_bool: {
              type: 'boolean',
            },
            g_obj: {
              type: 'object',
              required: [],
              properties: {
                key_str: {
                  type: 'string',
                },
                key_int: {
                  type: 'integer',
                },
                key_bool: {
                  type: 'boolean',
                },
              },
            },
            g_arr_str: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            g_map: {
              type: 'map',
            },
            g_date: {
              type: 'date-time',
            },
          },
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'end_0',
    },
  ],
  globalVariable: {
    type: 'object',
    required: [],
    properties: {
      str: {
        type: 'string',
        default: 'ABC',
      },
      num: {
        type: 'number',
        default: 123.123,
      },
      int: {
        type: 'integer',
        default: 123,
      },
      bool: {
        type: 'boolean',
        default: false,
      },
      obj: {
        type: 'object',
        required: [],
        properties: {
          key_str: {
            type: 'string',
          },
          key_int: {
            type: 'integer',
          },
          key_bool: {
            type: 'boolean',
          },
        },
        default: '{"key_str": "value","key_int": 123,"key_bool": true}',
      },
      arr_str: {
        type: 'array',
        items: {
          type: 'string',
        },
        default: '["AAA", "BBB", "CCC"]',
      },
      map: {
        type: 'map',
        default: '{"key": "value"}',
      },
      date: {
        type: 'date-time',
        default: '2000-01-01T00:00:00.000Z',
      },
    },
  },
};
