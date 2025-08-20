/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const loopBreakContinueSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 181,
          y: 337.5,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              extra: {
                index: 0,
              },
              items: {
                type: 'string',
              },
            },
          },
          required: ['tasks'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 2017,
          y: 337.4,
        },
      },
      data: {
        title: 'End',
        inputs: {
          type: 'object',
          properties: {
            outputs: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
        inputsValues: {
          outputs: {
            type: 'ref',
            content: ['loop_0', 'results'],
          },
        },
      },
    },
    {
      id: 'loop_0',
      type: 'loop',
      meta: {
        position: {
          x: 520,
          y: 90,
        },
      },
      data: {
        title: 'Loop_1',
        loopFor: {
          type: 'ref',
          content: ['start_0', 'tasks'],
        },
        loopOutputs: {
          results: {
            type: 'ref',
            content: ['llm_0', 'result'],
          },
          items: {
            type: 'ref',
            content: ['loop_0_locals', 'item'],
          },
          indexes: {
            type: 'ref',
            content: ['loop_0_locals', 'index'],
          },
        },
      },
      blocks: [
        {
          id: 'block_start_0',
          type: 'block-start',
          meta: {
            position: {
              x: 32,
              y: 149,
            },
          },
          data: {},
        },
        {
          id: 'block_end_0',
          type: 'block-end',
          meta: {
            position: {
              x: 1126,
              y: 371,
            },
          },
          data: {},
        },
        {
          id: 'llm_0',
          type: 'llm',
          meta: {
            position: {
              x: 804,
              y: 213,
            },
          },
          data: {
            title: 'LLM_0',
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
                type: 'template',
                content: 'You are a helpful assistant No.{{loop_0_locals.index}}',
              },
              prompt: {
                type: 'template',
                content: '{{loop_0_locals.item}}',
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
          id: 'condition_0',
          type: 'condition',
          meta: {
            position: {
              x: 344,
              y: 45,
            },
          },
          data: {
            title: 'Condition',
            conditions: [
              {
                value: {
                  left: {
                    type: 'ref',
                    content: ['loop_0_locals', 'index'],
                  },
                  operator: 'lte',
                  right: {
                    type: 'constant',
                    content: 2,
                  },
                },
                key: 'if_1',
              },
              {
                value: {
                  left: {
                    type: 'ref',
                    content: ['loop_0_locals', 'index'],
                  },
                  operator: 'gt',
                  right: {
                    type: 'constant',
                    content: 6,
                  },
                },
                key: 'if_2',
              },
              {
                value: {
                  type: 'expression',
                  content: '',
                  left: {
                    type: 'ref',
                    content: ['loop_0_locals', 'index'],
                  },
                  operator: 'is_not_empty',
                },
                key: 'if_3',
              },
            ],
          },
        },
        {
          id: 'continue_0',
          type: 'continue',
          meta: {
            position: {
              x: 804,
              y: 84.3,
            },
          },
          data: {
            title: 'Continue_0',
          },
        },
        {
          id: 'break_0',
          type: 'break',
          meta: {
            position: {
              x: 804,
              y: 149,
            },
          },
          data: {
            title: 'Break_0',
          },
        },
      ],
      edges: [
        {
          sourceNodeID: 'block_start_0',
          targetNodeID: 'condition_0',
        },
        {
          sourceNodeID: 'llm_0',
          targetNodeID: 'block_end_0',
        },
        {
          sourceNodeID: 'condition_0',
          targetNodeID: 'llm_0',
          sourcePortID: 'if_3',
        },
        {
          sourceNodeID: 'condition_0',
          targetNodeID: 'continue_0',
          sourcePortID: 'if_1',
        },
        {
          sourceNodeID: 'condition_0',
          targetNodeID: 'break_0',
          sourcePortID: 'if_2',
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
