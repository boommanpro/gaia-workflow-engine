/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowJSON } from '@flowgram.ai/free-layout-editor';

export const INITIAL_DATA: WorkflowJSON = {
  nodes: [
    {
      type: 'custom',
      id: 'custom_0',
      data: {
        title: 'Custom',
      },
    },
    {
      type: 'start',
      id: 'start_0',
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            str: { type: 'string' },
            obj: {
              type: 'object',
              properties: {
                obj2: {
                  type: 'object',
                  properties: {
                    num: { type: 'number' },
                  },
                },
              },
            },
            arr: {
              type: 'object',
              properties: {
                arr_str: { type: 'array', items: { type: 'string' } },
                arr_num: { type: 'array', items: { type: 'number' } },
                arr_bool: { type: 'array', items: { type: 'boolean' } },
                arr_int: { type: 'array', items: { type: 'integer' } },
                arr_obj: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      str: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      type: 'end',
      id: 'end_0',
      data: {
        title: 'End',
        inputsValues: {
          success: { type: 'constant', content: true, schema: { type: 'boolean' } },
          message: { type: 'ref', content: ['start_0', 'str'] },
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'custom_0',
    },
    {
      sourceNodeID: 'custom_0',
      targetNodeID: 'end_0',
    },
  ],
};
