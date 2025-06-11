import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const loopSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 218.5,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            tasks: {
              key: 7,
              name: 'tasks',
              isPropertyRequired: true,
              type: 'array',
              extra: {
                index: 0,
              },
              items: {
                type: 'string',
              },
            },
            system_prompt: {
              key: 1,
              name: 'system_prompt',
              isPropertyRequired: true,
              type: 'string',
              extra: {
                index: 1,
              },
            },
          },
          required: ['tasks', 'system_prompt'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 1340,
          y: 228.5,
        },
      },
      data: {
        title: 'End',
        inputs: {
          type: 'object',
          properties: {},
        },
        inputsValues: {},
      },
    },
    {
      id: 'loop_0',
      type: 'loop',
      meta: {
        position: {
          x: 560,
          y: 125,
        },
      },
      data: {
        title: 'Loop_1',
        batchFor: {
          type: 'ref',
          content: ['start_0', 'tasks'],
        },
      },
      blocks: [
        {
          id: 'llm_0',
          type: 'llm',
          meta: {
            position: {
              x: 200,
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
                content: 0.6,
              },
              systemPrompt: {
                type: 'ref',
                content: ['start_0', 'system_prompt'],
              },
              prompt: {
                type: 'ref',
                content: ['loop_0_locals', 'item'],
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
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'loop_0',
    },
    {
      sourceNodeID: 'loop_0',
      targetNodeID: 'end_0',
    },
  ],
};
