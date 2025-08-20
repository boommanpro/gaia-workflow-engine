/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export const codeSchema: WorkflowSchema = {
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
            input: {
              type: 'string',
            },
          },
          required: ['input'],
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
          input: {
            type: 'ref',
            content: ['start_0', 'input'],
          },
          output_key0: {
            type: 'ref',
            content: ['code_0', 'key0'],
          },
          output_key1: {
            type: 'ref',
            content: ['code_0', 'key1'],
          },
          output_key2: {
            type: 'ref',
            content: ['code_0', 'key2'],
          },
        },
        inputs: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
            },
            output_key0: {
              type: 'string',
            },
            output_key1: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            output_key2: {
              type: 'object',
              properties: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    {
      id: 'code_0',
      type: 'code',
      meta: {
        position: {
          x: 652.2,
          y: 0,
        },
      },
      data: {
        title: 'Code_0',
        inputsValues: {
          input: {
            type: 'ref',
            content: ['start_0', 'input'],
          },
        },
        inputs: {
          type: 'object',
          required: ['input'],
          properties: {
            input: {
              type: 'string',
            },
          },
        },
        outputs: {
          type: 'object',
          properties: {
            key0: {
              type: 'string',
            },
            key1: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            key2: {
              type: 'object',
              properties: {
                type: 'string',
              },
            },
          },
        },
        script: {
          language: 'javascript',
          content:
            '// Here, you can use \'params\' to access the input variables in the node and use \'output\' to output the result\n// \'params\'  have already been properly injected into the environment\n// Below is an example of retrieving the value of the parameter \'input\' from the node\'s input:\n// const input = params.input; \n// Below is an example of outputting a \'ret\' object containing multiple data types:\n// const output = { "name": \'Jack\', "hobbies": ["reading", "traveling"] };\nasync function main({ params }) {\n    // Construct the output object\n    const output = {\n        "key0": params.input + params.input, // Concatenate the value of the two input parameters\n        "key1": ["hello", "world"], // Output an array\n        "key2": { // Output an Object\n            "key21": "hi"\n        },\n    };\n    return output;\n}',
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'code_0',
    },
    {
      sourceNodeID: 'code_0',
      targetNodeID: 'end_0',
    },
  ],
};
