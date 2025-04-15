import { FlowDocumentJSON } from './typings';

export const initialData: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 161.82825934250104,
          y: 363.9269239259368,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              default: 'Hello Flow.',
            },
          },
        },
        description: 'start node',
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 2543.676315296969,
          y: 280.9269239259368,
        },
      },
      data: {
        title: 'End',
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
              default: 'code_cNTn9.outputs.result',
            },
          },
        },
        description: 'end node',
      },
    },
    {
      id: 'note_i0udq4q_1744207814436',
      type: 'note',
      meta: {
        position: {
          x: 698.8404512562362,
          y: 731.1614364690548,
        },
      },
      data: {
        description: '注释能力',
      },
    },
    {
      id: 'code_T5DNl',
      type: 'code',
      meta: {
        position: {
          x: 614.3820904384166,
          y: 166.92692392593682,
        },
      },
      data: {
        title: 'Code_1',
        description: '代码组件',
        inputsValues: {},
        config: {
          language: 'aviator',
          code: 'return {\n    "a":"a",\n    "b":"b"\n}',
        },
        inputs: {
          type: 'object',
          required: [],
          properties: {},
        },
        outputs: {
          type: 'object',
          properties: {
            a: {
              type: 'string',
              default: 'a',
            },
            b: {
              type: 'string',
              default: 'b',
            },
          },
        },
      },
    },
    {
      id: 'condition_U6nw1',
      type: 'condition',
      meta: {
        position: {
          x: 1066.9359215343322,
          y: 327.4269239259369,
        },
      },
      data: {
        title: 'Condition',
        inputsValues: {
          conditions: [
            {
              key: 'if_fcWqTi',
              value: {
                type: 'expression',
                content: 'start_0.outputs.query',
              },
            },
            {
              key: 'if_11gKZL',
              value: {
                type: 'expression',
                content: 'code_T5DNl.outputs.a',
              },
            },
            {
              key: 'if_z-1XKS',
              value: {
                type: 'expression',
                content: 'code_T5DNl.outputs.b',
              },
            },
          ],
        },
        inputs: {
          type: 'object',
          properties: {
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                  },
                  value: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      id: 'code_2SXWb',
      type: 'code',
      meta: {
        position: {
          x: 1519.489752630248,
          y: -177.98061397030543,
        },
      },
      data: {
        title: 'Code_2',
        description: '代码组件',
        inputsValues: {},
        config: {
          language: 'aviator',
          code: 'return {\n    "a":"1"\n}',
        },
        inputs: {
          type: 'object',
          required: [],
          properties: {},
        },
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
              default: 'a',
            },
          },
        },
      },
    },
    {
      id: 'code_zz31I',
      type: 'code',
      meta: {
        position: {
          x: 1519.489752630248,
          y: 298.1614364690548,
        },
      },
      data: {
        title: 'Code_3',
        description: '代码组件',
        inputsValues: {},
        config: {
          language: 'aviator',
          code: 'return {\n    "a":"b"\n}',
        },
        inputs: {
          type: 'object',
          required: [],
          properties: {},
        },
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
              default: 'a',
            },
          },
        },
      },
    },
    {
      id: 'code_47q41',
      type: 'code',
      meta: {
        position: {
          x: 1519.489752630248,
          y: 765.0223125766685,
        },
      },
      data: {
        title: 'Code_4',
        description: '代码组件',
        inputsValues: {},
        config: {
          language: 'aviator',
          code: 'return {\n    "a":"c"\n}',
        },
        inputs: {
          type: 'object',
          required: [],
          properties: {},
        },
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
              default: 'a',
            },
          },
        },
      },
    },
    {
      id: 'code_cNTn9',
      type: 'code',
      meta: {
        position: {
          x: 2027.9717228271456,
          y: 83.96858252201957,
        },
      },
      data: {
        title: 'Code_5',
        description: '代码组件',
        inputsValues: {},
        config: {
          language: 'aviator',
          code: 'return a1||a2||a3;',
        },
        inputs: {
          type: 'object',
          required: [],
          properties: {
            a1: {
              type: 'string',
              default: 'code_2SXWb.outputs.result',
            },
            a2: {
              type: 'string',
              default: 'code_zz31I.outputs.result',
            },
            a3: {
              type: 'string',
              default: 'code_47q41.outputs.result',
            },
          },
        },
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
              default: 'a',
            },
          },
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'code_T5DNl',
    },
    {
      sourceNodeID: 'code_cNTn9',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'code_T5DNl',
      targetNodeID: 'condition_U6nw1',
    },
    {
      sourceNodeID: 'condition_U6nw1',
      targetNodeID: 'code_2SXWb',
      sourcePortID: 'if_fcWqTi',
    },
    {
      sourceNodeID: 'condition_U6nw1',
      targetNodeID: 'code_zz31I',
      sourcePortID: 'if_11gKZL',
    },
    {
      sourceNodeID: 'condition_U6nw1',
      targetNodeID: 'code_47q41',
      sourcePortID: 'if_z-1XKS',
    },
    {
      sourceNodeID: 'code_2SXWb',
      targetNodeID: 'code_cNTn9',
    },
    {
      sourceNodeID: 'code_zz31I',
      targetNodeID: 'code_cNTn9',
    },
    {
      sourceNodeID: 'code_47q41',
      targetNodeID: 'code_cNTn9',
    },
  ],
};
