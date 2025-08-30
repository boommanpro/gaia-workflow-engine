/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocumentJSON } from './typings';

export const initialData: FlowDocumentJSON ={
  "nodes": [
    {
      "id": "start_0",
      "type": "start",
      "meta": {
        "position": {
          "x": 180,
          "y": 178.5
        }
      },
      "data": {
        "title": "开始节点",
        "outputs": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "default": "Hello Flow."
            },
            "enable": {
              "type": "boolean",
              "default": true
            },
            "array_obj": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "int": {
                    "type": "number"
                  },
                  "str": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      "id": "end_0",
      "type": "end",
      "meta": {
        "position": {
          "x": 1560,
          "y": 178.5
        }
      },
      "data": {
        "title": "结束节点",
        "inputsValues": {
          "success": {
            "type": "constant",
            "content": true,
            "schema": {
              "type": "boolean"
            },
            "extra": {
              "index": 0
            }
          },
          "query": {
            "type": "ref",
            "content": [
              "start_0",
              "query"
            ],
            "extra": {
              "index": 1
            }
          },
          "c": {
            "type": "ref",
            "content": [
              "code_KZCi_",
              "c"
            ],
            "extra": {
              "index": 2
            }
          }
        },
        "inputs": {
          "type": "object",
          "properties": {
            "success": {
              "type": "boolean"
            },
            "query": {
              "type": "string"
            },
            "c": {
              "type": "string"
            }
          }
        }
      }
    },
    {
      "id": "159623",
      "type": "comment",
      "meta": {
        "position": {
          "x": 180,
          "y": 400.5
        }
      },
      "data": {
        "size": {
          "width": 240,
          "height": 150
        },
        "note": "hi ~\n\nthis is a comment node\n\n- flowgram.ai"
      }
    },
    {
      "id": "condition_mhwdG",
      "type": "branches",
      "meta": {
        "position": {
          "x": 640,
          "y": 0
        }
      },
      "data": {
        "title": "数据处理",
        "branches": [
          {
            "id": "branch_2-6Bp",
            "title": "分支1",
            "logic": "and",
            "conditions": [
              {
                "value": {
                  "type": "expression",
                  "content": "",
                  "left": {
                    "type": "ref",
                    "content": [
                      "start_0",
                      "enable"
                    ]
                  },
                  "operator": "is_false"
                },
                "key": "if_L4E_Ka"
              }
            ]
          },
          {
            "id": "branch_wRrD1",
            "title": "Branch 2",
            "logic": "and",
            "conditions": [
              {
                "value": {
                  "type": "expression",
                  "content": "",
                  "left": {
                    "type": "ref",
                    "content": [
                      "start_0",
                      "enable"
                    ]
                  },
                  "operator": "eq",
                  "right": {
                    "type": "constant",
                    "content": true,
                    "schema": {
                      "type": "boolean",
                      "extra": {
                        "weak": true
                      }
                    }
                  }
                },
                "key": "if_h4o9i8"
              }
            ]
          }
        ],
        "description": "分支节点"
      }
    },
    {
      "id": "code_KZCi_",
      "type": "code",
      "meta": {
        "position": {
          "x": 1100,
          "y": 233
        }
      },
      "data": {
        "title": "Code_1",
        "inputsValues": {
          "a": {
            "type": "ref",
            "content": [
              "start_0",
              "query"
            ],
            "extra": {
              "index": 0
            }
          },
          "b": {
            "type": "ref",
            "content": [
              "start_0",
              "enable"
            ],
            "extra": {
              "index": 1
            }
          }
        },
        "script": {
          "language": "javascript",
          "content": "// Here, you can retrieve input variables from the node using 'params' and output results using 'ret'.\n// 'params' has been correctly injected into the environment.\n// Here's an example of getting the value of the parameter named 'input' from the node input:\n// const input = params.input;\n// Here's an example of outputting a 'ret' object containing multiple data types:\n// const ret = { \"name\": 'Xiaoming', \"hobbies\": [\"Reading\", \"Traveling\"] };\n\nreturn {\n  c:a+b\n}"
        },
        "outputs": {
          "type": "object",
          "properties": {
            "c": {
              "type": "string"
            }
          },
          "required": []
        },
        "inputs": {
          "type": "object",
          "properties": {
            "a": {
              "type": "string"
            },
            "b": {
              "type": "boolean"
            }
          }
        }
      }
    }
  ],
  "edges": [
    {
      "sourceNodeID": "start_0",
      "targetNodeID": "condition_mhwdG"
    },
    {
      "sourceNodeID": "condition_mhwdG",
      "targetNodeID": "end_0",
      "sourcePortID": "branch_2-6Bp"
    },
    {
      "sourceNodeID": "code_KZCi_",
      "targetNodeID": "end_0"
    },
    {
      "sourceNodeID": "condition_mhwdG",
      "targetNodeID": "code_KZCi_",
      "sourcePortID": "branch_wRrD1"
    }
  ]
}
