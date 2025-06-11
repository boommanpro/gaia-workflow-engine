import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const basicSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 69,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            model_name: {
              key: 14,
              name: 'model_name',
              type: 'string',
              extra: {
                index: 1,
              },
              isPropertyRequired: true,
            },
            llm_settings: {
              key: 17,
              name: 'llm_settings',
              type: 'object',
              extra: {
                index: 2,
              },
              properties: {
                temperature: {
                  key: 18,
                  name: 'temperature',
                  type: 'number',
                  extra: {
                    index: 1,
                  },
                },
              },
              required: [],
            },
            prompt: {
              key: 19,
              name: 'prompt',
              type: 'string',
              extra: {
                index: 3,
              },
              isPropertyRequired: true,
            },
          },
          required: ['model_name', 'prompt'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1121.3,
          y: 69,
        },
      },
      data: {
        title: 'End',
        inputsValues: {
          llm_res: {
            type: 'ref',
            content: ['llm_0', 'result'],
          },
          llm_prompt: {
            type: 'ref',
            content: ['start_0', 'prompt'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            llm_res: {
              type: 'string',
            },
            llm_prompt: {
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
          x: 650.65,
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
            type: 'ref',
            content: ['start_0', 'prompt'],
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
      targetNodeID: 'llm_0',
    },
    {
      sourceNodeID: 'llm_0',
      targetNodeID: 'end_0',
    },
  ],
};
