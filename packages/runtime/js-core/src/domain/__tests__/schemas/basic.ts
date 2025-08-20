/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const basicSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 171.6,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            model_name: {
              type: 'string',
              extra: {
                index: 0,
              },
            },
            llm_settings: {
              type: 'object',
              extra: {
                index: 1,
              },
              properties: {
                temperature: {
                  type: 'number',
                  extra: {
                    index: 1,
                  },
                },
              },
              required: [],
            },
            work: {
              type: 'object',
              extra: {
                index: 2,
              },
              properties: {
                role: {
                  type: 'string',
                  extra: {
                    index: 0,
                  },
                },
                task: {
                  type: 'string',
                  extra: {
                    index: 1,
                  },
                },
              },
              required: ['role', 'task'],
            },
          },
          required: ['model_name', 'work'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1124.4,
          y: 171.6,
        },
      },
      data: {
        title: 'End',
        inputsValues: {
          llm_res: {
            type: 'ref',
            content: ['llm_0', 'result'],
          },
          llm_task: {
            type: 'ref',
            content: ['start_0', 'work', 'task'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            llm_res: {
              type: 'string',
            },
            llm_task: {
              type: 'string',
            },
          },
        },
      },
    },
    {
      id: 'llm_0',
      type: 'llm',
      meta: {
        position: {
          x: 652.2,
          y: 0,
        },
      },
      data: {
        title: 'LLM_1',
        inputsValues: {
          modelName: {
            type: 'ref',
            content: ['start_0', 'model_name'],
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
            content: ['start_0', 'llm_settings', 'temperature'],
          },
          prompt: {
            type: 'template',
            content: '<Role>{{start_0.work.role}}</Role>\n\n<Task>\n{{start_0.work.task}}\n</Task>',
          },
          systemPrompt: {
            type: 'constant',
            content: 'You are a helpful AI assistant.',
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
      targetNodeID: 'llm_0',
    },
    {
      sourceNodeID: 'llm_0',
      targetNodeID: 'end_0',
    },
  ],
};
