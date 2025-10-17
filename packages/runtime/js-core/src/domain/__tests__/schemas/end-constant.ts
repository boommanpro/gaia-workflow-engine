/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const endConstantSchema: WorkflowSchema = {
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
          str: {
            type: 'constant',
            content: 'ABC',
          },
          num: {
            type: 'constant',
            content: 123.123,
          },
          int: {
            type: 'constant',
            content: 123,
          },
          bool: {
            type: 'constant',
            content: false,
          },
          obj: {
            type: 'constant',
            content: '{"key_str": "value","key_int": 123,"key_bool": true}',
          },
          map: {
            type: 'constant',
            content: '{"key": "value"}',
          },
          arr_str: {
            type: 'constant',
            content: '["AAA", "BBB", "CCC"]',
          },
          date: {
            type: 'constant',
            content: '2000-01-01T00:00:00.000Z',
          },
        },
        inputs: {
          type: 'object',
          properties: {
            str: {
              type: 'string',
            },
            num: {
              type: 'number',
            },
            int: {
              type: 'integer',
            },
            bool: {
              type: 'boolean',
            },
            obj: {
              type: 'object',
            },
            map: {
              type: 'map',
            },
            arr_str: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            date: {
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
