/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const branchTwoLayersSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 368.3,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            model_id: {
              type: 'integer',
              extra: {
                index: 0,
              },
            },
            prompt: {
              type: 'string',
              extra: {
                index: 1,
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
          x: 2020,
          y: 368.29999999999995,
        },
      },
      data: {
        title: 'End',
        inputs: {
          type: 'object',
          properties: {
            m3_res: {
              type: 'string',
            },
            m4_res: {
              type: 'string',
            },
          },
        },
        inputsValues: {
          m3_res: {
            type: 'ref',
            content: ['llm_3', 'result'],
          },
          m4_res: {
            type: 'ref',
            content: ['llm_4', 'result'],
          },
        },
      },
    },
    {
      id: 'condition_0',
      type: 'condition',
      meta: {
        position: {
          x: 640,
          y: 304.8,
        },
      },
      data: {
        title: 'Condition',
        conditions: [
          {
            value: {
              left: {
                type: 'ref',
                content: ['start_0', 'model_id'],
              },
              operator: 'eq',
              right: {
                type: 'constant',
                content: 1,
              },
            },
            key: 'if_1',
          },
          {
            value: {
              left: {
                type: 'ref',
                content: ['start_0', 'model_id'],
              },
              operator: 'eq',
              right: {
                type: 'constant',
                content: 2,
              },
            },
            key: 'if_2',
          },
        ],
      },
    },
    {
      id: 'llm_1',
      type: 'llm',
      meta: {
        position: {
          x: 1100,
          y: 0,
        },
      },
      data: {
        title: 'LLM_1',
        inputsValues: {
          modelName: {
            type: 'constant',
            content: 'AI_MODEL_1',
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
            type: 'constant',
            content: 0.5,
          },
          systemPrompt: {
            type: 'template',
            content: "I'm Model 1",
          },
          prompt: {
            type: 'template',
            content: '{{start_0.prompt}}',
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
      id: 'llm_2',
      type: 'llm',
      meta: {
        position: {
          x: 1100,
          y: 459.3,
        },
      },
      data: {
        title: 'LLM_2',
        inputsValues: {
          modelName: {
            type: 'constant',
            content: 'AI_MODEL_2',
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
            type: 'constant',
            content: 0.6,
          },
          systemPrompt: {
            type: 'template',
            content: "I'm Model 2",
          },
          prompt: {
            type: 'template',
            content: '{{start_0.prompt}}',
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
      id: 'llm_3',
      type: 'llm',
      meta: {
        position: {
          x: 1560,
          y: 0,
        },
      },
      data: {
        title: 'LLM_3',
        inputsValues: {
          modelName: {
            type: 'constant',
            content: 'AI_MODEL_3',
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
            type: 'constant',
            content: 0.5,
          },
          systemPrompt: {
            type: 'template',
            content: "I'm Model 3",
          },
          prompt: {
            type: 'template',
            content: '{{llm_1.result}}',
          },
        },
        inputs: {
          type: 'object',
          required: ['modelName', 'apiKey', 'apiHost', 'temperature', 'prompt'],
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
      id: 'llm_4',
      type: 'llm',
      meta: {
        position: {
          x: 1560,
          y: 459.8,
        },
      },
      data: {
        title: 'LLM_4',
        inputsValues: {
          modelName: {
            type: 'constant',
            content: 'AI_MODEL_4',
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
            type: 'constant',
            content: 0.5,
          },
          systemPrompt: {
            type: 'template',
            content: "I'm Model 4",
          },
          prompt: {
            type: 'template',
            content: '{{llm_2.result}}',
          },
        },
        inputs: {
          type: 'object',
          required: ['modelName', 'apiKey', 'apiHost', 'temperature', 'prompt'],
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
      targetNodeID: 'condition_0',
    },
    {
      sourceNodeID: 'llm_3',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'llm_4',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'condition_0',
      targetNodeID: 'llm_1',
      sourcePortID: 'if_1',
    },
    {
      sourceNodeID: 'condition_0',
      targetNodeID: 'llm_2',
      sourcePortID: 'if_2',
    },
    {
      sourceNodeID: 'llm_1',
      targetNodeID: 'llm_3',
    },
    {
      sourceNodeID: 'llm_2',
      targetNodeID: 'llm_4',
    },
  ],
};
