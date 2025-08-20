/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const llmRealSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 152.2,
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
            api_key: {
              type: 'string',
              extra: {
                index: 1,
              },
            },
            api_host: {
              type: 'string',
              extra: {
                index: 2,
              },
            },
            formula: {
              type: 'string',
              extra: {
                index: 3,
              },
            },
          },
          required: ['model_name', 'api_key', 'api_host', 'formula'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1124.4,
          y: 152.2,
        },
      },
      data: {
        title: 'End',
        inputsValues: {
          answer: {
            type: 'ref',
            content: ['llm_0', 'result'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            answer: {
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
        title: 'LLM_0',
        inputsValues: {
          modelName: {
            type: 'ref',
            content: ['start_0', 'model_name'],
          },
          apiKey: {
            type: 'ref',
            content: ['start_0', 'api_key'],
          },
          apiHost: {
            type: 'ref',
            content: ['start_0', 'api_host'],
          },
          temperature: {
            type: 'constant',
            content: 0,
          },
          prompt: {
            type: 'template',
            content:
              'Just give me the answer of "{{start_0.formula}}=?", just one number, no other words',
          },
          systemPrompt: {
            type: 'template',
            content: 'You are a "math formula" calculator.',
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
