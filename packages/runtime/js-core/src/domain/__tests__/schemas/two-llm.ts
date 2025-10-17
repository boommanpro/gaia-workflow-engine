/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const twoLLMSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 222.5,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              extra: {
                index: 0,
              },
            },
            enable: {
              type: 'boolean',
              extra: {
                index: 1,
              },
            },
            array_obj: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  int: {
                    type: 'number',
                  },
                  str: {
                    type: 'string',
                  },
                },
              },
              extra: {
                index: 2,
              },
            },
            num: {
              type: 'number',
              extra: {
                index: 3,
              },
            },
            model: {
              type: 'string',
              extra: {
                index: 5,
              },
            },
          },
          required: [],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1100,
          y: 235.5,
        },
      },
      data: {
        title: 'End',
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
            },
          },
        },
      },
    },
    {
      id: 'llm_2',
      type: 'llm',
      meta: {
        position: {
          x: 640,
          y: 327,
        },
      },
      data: {
        title: 'LLM_2',
        inputsValues: {
          systemPrompt: {
            type: 'constant',
            content: 'BBBB',
          },
          modelName: {
            type: 'ref',
            content: ['start_0', 'model'],
          },
          apiKey: {
            type: 'constant',
            content: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          },
          apiHost: {
            type: 'constant',
            content: 'https://mock-ai-url/api/v3',
          },
          temperature: {
            type: 'ref',
            content: ['start_0', 'num'],
          },
          prompt: {
            type: 'template',
            content: '{{start_0.query}}',
          },
        },
        inputs: {
          type: 'object',
          required: ['modelName', 'temperature', 'prompt'],
          properties: {
            modelName: {
              type: 'string',
            },
            apiKey: {
              type: 'string',
            },
            apiHost: {
              type: 'string',
            },
            temperature: {
              type: 'number',
            },
            systemPrompt: {
              type: 'string',
              extra: {
                formComponent: 'prompt-editor',
              },
            },
            prompt: {
              type: 'string',
              extra: {
                formComponent: 'prompt-editor',
              },
            },
          },
        },
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
            },
          },
        },
      },
    },
    {
      id: 'llm_1',
      type: 'llm',
      meta: {
        position: {
          x: 640,
          y: 0,
        },
      },
      data: {
        title: 'LLM_1',
        inputsValues: {
          modelName: {
            type: 'ref',
            content: ['start_0', 'model'],
          },
          apiKey: {
            type: 'constant',
            content: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          },
          apiHost: {
            type: 'constant',
            content: 'https://mock-ai-url/api/v3',
          },
          temperature: {
            type: 'ref',
            content: ['start_0', 'num'],
          },
          systemPrompt: {
            type: 'constant',
            content: 'AAAA',
          },
          prompt: {
            type: 'template',
            content: '{{start_0.query}}',
          },
        },
        inputs: {
          type: 'object',
          required: ['modelName', 'temperature', 'prompt'],
          properties: {
            modelName: {
              type: 'string',
            },
            apiKey: {
              type: 'string',
            },
            apiHost: {
              type: 'string',
            },
            temperature: {
              type: 'number',
            },
            systemPrompt: {
              type: 'string',
              extra: {
                formComponent: 'prompt-editor',
              },
            },
            prompt: {
              type: 'string',
              extra: {
                formComponent: 'prompt-editor',
              },
            },
          },
        },
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
            },
          },
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'llm_1',
    },
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'llm_2',
    },
    {
      sourceNodeID: 'llm_2',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'llm_1',
      targetNodeID: 'end_0',
    },
  ],
};
