/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const httpSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 125.5,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            host: {
              type: 'string',
              extra: {
                index: 0,
              },
            },
            path: {
              type: 'string',
              extra: {
                index: 1,
              },
            },
          },
          required: ['host', 'path'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1100,
          y: 125.5,
        },
      },
      data: {
        title: 'End',
        inputsValues: {
          res: {
            type: 'ref',
            content: ['http_0', 'body'],
          },
          code: {
            type: 'ref',
            content: ['http_0', 'statusCode'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            res: {
              type: 'string',
            },
            code: {
              type: 'integer',
            },
          },
        },
      },
    },
    {
      id: 'http_0',
      type: 'http',
      meta: {
        position: {
          x: 640,
          y: 0,
        },
      },
      data: {
        title: 'HTTP_0',
        api: {
          method: 'POST',
          url: {
            type: 'template',
            content: 'https://{{start_0.host}}{{start_0.path}}',
          },
        },
        body: {
          bodyType: 'JSON',
          json: {
            type: 'template',
            content: '{}',
          },
        },
        headers: {},
        params: {},
        outputs: {
          type: 'object',
          properties: {
            body: {
              type: 'string',
            },
            headers: {
              type: 'object',
            },
            statusCode: {
              type: 'integer',
            },
          },
        },
        timeout: {
          timeout: 10000,
          retryTimes: 1,
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'http_0',
    },
    {
      sourceNodeID: 'http_0',
      targetNodeID: 'end_0',
    },
  ],
};
