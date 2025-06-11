import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const basicLLMSchema: WorkflowSchema = {
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
            model_name: {
              key: 14,
              name: 'model_name',
              type: 'string',
              extra: {
                index: 1,
              },
              isPropertyRequired: true,
            },
            prompt: {
              key: 5,
              name: 'prompt',
              type: 'string',
              extra: {
                index: 3,
              },
              isPropertyRequired: true,
            },
            api_key: {
              key: 19,
              name: 'api_key',
              type: 'string',
              extra: {
                index: 4,
              },
              isPropertyRequired: true,
            },
            api_host: {
              key: 20,
              name: 'api_host',
              type: 'string',
              extra: {
                index: 5,
              },
              isPropertyRequired: true,
            },
          },
          required: ['model_name', 'prompt', 'api_key', 'api_host'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1000,
          y: 0,
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
          x: 500,
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
