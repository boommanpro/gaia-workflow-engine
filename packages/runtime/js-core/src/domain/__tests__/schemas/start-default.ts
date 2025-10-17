/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const startDefaultSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 0,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
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
          s_str: {
            type: 'ref',
            content: ['start_0', 'str'],
          },
          s_num: {
            type: 'ref',
            content: ['start_0', 'num'],
          },
          s_int: {
            type: 'ref',
            content: ['start_0', 'int'],
          },
          s_bool: {
            type: 'ref',
            content: ['start_0', 'bool'],
          },
          s_obj: {
            type: 'ref',
            content: ['start_0', 'obj'],
          },
          s_arr_str: {
            type: 'ref',
            content: ['start_0', 'arr_str'],
          },
          s_map: {
            type: 'ref',
            content: ['start_0', 'map'],
          },
          s_date: {
            type: 'ref',
            content: ['start_0', 'date'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            s_str: {
              type: 'string',
            },
            s_num: {
              type: 'number',
            },
            s_int: {
              type: 'integer',
            },
            s_bool: {
              type: 'boolean',
            },
            s_obj: {
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
            s_arr_str: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            s_map: {
              type: 'map',
            },
            s_date: {
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
};
