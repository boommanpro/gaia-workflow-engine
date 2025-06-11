import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const branchSchema: WorkflowSchema = {
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
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            model_id: {
              key: 0,
              name: 'model_id',
              isPropertyRequired: false,
              type: 'integer',
              default: 'Hello Flow.',
              extra: {
                index: 0,
              },
            },
            prompt: {
              key: 5,
              name: 'prompt',
              isPropertyRequired: false,
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
          x: 1500,
          y: 0,
        },
      },
      data: {
        title: 'End',
        inputs: {
          type: 'object',
          properties: {
            m1_res: {
              type: 'string',
            },
            m2_res: {
              type: 'string',
            },
          },
        },
        inputsValues: {
          m1_res: {
            type: 'ref',
            content: ['llm_1', 'result'],
          },
          m2_res: {
            type: 'ref',
            content: ['llm_2', 'result'],
          },
        },
      },
    },
    {
      id: 'condition_0',
      type: 'condition',
      meta: {
        position: {
          x: 500,
          y: 0,
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
          x: 1000,
          y: -500,
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
            type: 'constant',
            content: "I'm Model 1.",
          },
          prompt: {
            type: 'ref',
            content: ['start_0', 'prompt'],
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
            },
            prompt: {
              type: 'string',
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
          x: 1000,
          y: 500,
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
            type: 'constant',
            content: "I'm Model 2.",
          },
          prompt: {
            type: 'ref',
            content: ['start_0', 'prompt'],
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
            },
            prompt: {
              type: 'string',
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
      sourceNodeID: 'llm_1',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'llm_2',
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
  ],
};
