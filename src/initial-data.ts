import { FlowDocumentJSON } from './typings';

export const initialData: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 313.5,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            a: {
              type: 'string',
              default: '1',
            },
            b: {
              type: 'string',
              default: '2',
            },
            c: {
              type: 'string',
              default: '3',
            },
            d: {
              type: 'string',
              default: '4',
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
          x: 2480,
          y: 313.5,
        },
      },
      data: {
        title: 'End',
        outputs: {
          type: 'object',
          properties: {
            result: {
              type: 'string',
              default: 'code_Qzvgd.outputs.result',
            },
          },
        },
        description: 'end node',
      },
    },
    {
      id: 'code_sCNs8',
      type: 'code',
      meta: {
        position: {
          x: 640,
          y: 313.5,
        },
      },
      data: {
        title: 'Code_2',
        description: '代码组件',
        config: {
          language: 'javaScriptFunc',
          code: 'return {\n    "a":a,\n    "b":b\n}',
        },
        inputs: {
          type: 'object',
          properties: {
            a: {
              type: 'string',
              default: {
                type: 'ref',
                content: 'start_0.outputs.a',
              },
            },
            b: {
              type: 'string',
              default: {
                type: 'literal',
                content: 'b1',
              },
            },
            c: {
              type: 'string',
              default: {
                type: 'literal',
                content: 'c1',
              },
            },
          },
        },
        outputs: {
          type: 'object',
          properties: {
            a: {
              type: 'string',
              default: '12',
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
      id: 'condition_Pk7Qg',
      type: 'condition',
      meta: {
        position: {
          x: 1100,
          y: 243.4,
        },
      },
      data: {
        title: 'Condition',
        inputsValues: {
          branches: [
            {
              condition: {
                logic: 1,
                description: '规则说明',
                conditions: [
                  {
                    operator: 1,
                    left: {
                      type: 'expression',
                      content: 'start_0.outputs.a',
                    },
                    right: {
                      type: 'expression',
                      content: 'start_0.outputs.b',
                    },
                  },
                ],
              },
            },
            {
              condition: {
                logic: 1,
                description: '规则说明',
                conditions: [
                  {
                    operator: 1,
                    left: {
                      type: 'expression',
                      content: 'start_0.outputs.d',
                    },
                    right: {
                      type: 'expression',
                      content: 'code_sCNs8.outputs.a',
                    },
                  },
                ],
              },
            },
            {
              condition: {
                logic: 1,
                description: '规则说明',
                conditions: [
                  {
                    operator: 1,
                    left: {
                      type: 'expression',
                      content: 'start_0.outputs.a',
                    },
                    right: {
                      type: 'expression',
                      content: 'code_sCNs8.outputs.b',
                    },
                  },
                ],
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
      id: 'code_q303y',
      type: 'code',
      meta: {
        position: {
          x: 1560,
          y: 627,
        },
      },
      data: {
        title: 'Code_3',
        description: '代码组件',
        config: {
          language: 'javaScriptFunc',
          code: '',
        },
        inputs: {
          type: 'object',
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
      id: 'code_-v33c',
      type: 'code',
      meta: {
        position: {
          x: 1560,
          y: 0,
        },
      },
      data: {
        title: 'Code_4',
        description: '代码组件',
        config: {
          language: 'javaScriptFunc',
          code: '',
        },
        inputs: {
          type: 'object',
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
      id: 'code_Qzvgd',
      type: 'code',
      meta: {
        position: {
          x: 1560,
          y: 209,
        },
      },
      data: {
        title: 'Code_5',
        description: '代码组件',
        config: {
          language: 'javaScriptFunc',
          code: '',
        },
        inputs: {
          type: 'object',
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
      id: 'code_WpFEL',
      type: 'code',
      meta: {
        position: {
          x: 1560,
          y: 418,
        },
      },
      data: {
        title: 'Code_6',
        description: '代码组件',
        config: {
          language: 'javaScriptFunc',
          code: '',
        },
        inputs: {
          type: 'object',
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
      id: 'code_PHkiO',
      type: 'code',
      meta: {
        position: {
          x: 2020,
          y: 313.5,
        },
      },
      data: {
        title: 'Code_7',
        description: '代码组件',
        config: {
          language: 'javaScriptFunc',
          code: '',
        },
        inputs: {
          type: 'object',
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
      targetNodeID: 'code_sCNs8',
    },
    {
      sourceNodeID: 'code_PHkiO',
      targetNodeID: 'end_0',
    },
    {
      sourceNodeID: 'code_sCNs8',
      targetNodeID: 'condition_Pk7Qg',
    },
    {
      sourceNodeID: 'condition_Pk7Qg',
      targetNodeID: 'code_q303y',
      sourcePortID: 'false',
    },
    {
      sourceNodeID: 'condition_Pk7Qg',
      targetNodeID: 'code_-v33c',
      sourcePortID: 'true_0',
    },
    {
      sourceNodeID: 'condition_Pk7Qg',
      targetNodeID: 'code_Qzvgd',
      sourcePortID: 'true_1',
    },
    {
      sourceNodeID: 'condition_Pk7Qg',
      targetNodeID: 'code_WpFEL',
      sourcePortID: 'true_2',
    },
    {
      sourceNodeID: 'code_q303y',
      targetNodeID: 'code_PHkiO',
    },
    {
      sourceNodeID: 'code_-v33c',
      targetNodeID: 'code_PHkiO',
    },
    {
      sourceNodeID: 'code_Qzvgd',
      targetNodeID: 'code_PHkiO',
    },
    {
      sourceNodeID: 'code_WpFEL',
      targetNodeID: 'code_PHkiO',
    },
  ],
};
