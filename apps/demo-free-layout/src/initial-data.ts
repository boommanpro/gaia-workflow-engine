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
          "x": 1627.8401464307506,
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
              "code_q6CmU",
              "helloCodeExecute"
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
      "id": "condition_alRhO",
      "type": "branches",
      "meta": {
        "position": {
          "x": 684.8383160463699,
          "y": -35.45851128737033
        }
      },
      "data": {
        "title": "Branches",
        "branches": [
          {
            "id": "branch_R_7LT",
            "title": "Branch 1",
            "logic": "or",
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
                  "operator": "is_true"
                },
                "key": "if_FtVDum"
              },
              {
                "value": {
                  "type": "expression",
                  "content": "",
                  "left": {
                    "type": "ref",
                    "content": [
                      "start_0",
                      "query"
                    ]
                  },
                  "operator": "is_not_empty"
                },
                "key": "if_xqJWdz"
              }
            ]
          }
        ]
      }
    },
    {
      "id": "code_q6CmU",
      "type": "code",
      "meta": {
        "position": {
          "x": 1217.8401464307506,
          "y": 156.63361805979258
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
          "v": {
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
          "language": "java",
          "content": "package cn.boommanpro.gaiaworkflow;\n\nimport cn.boommanpro.gaia.workflow.code.CodeExecute;\n\nimport java.util.HashMap;\nimport java.util.Map;\n\npublic class HelloCodeExecute implements CodeExecute {\n    @Override\n    public Map<String, Object> execute(Map<String, Object> inputs) {\n        HashMap<String, Object> result = new HashMap<>();\n        result.putAll(inputs);\n        result.put(\"helloCodeExecute\", \"123\");\n        return result;\n    }\n}\n"
        },
        "outputs": {
          "type": "object",
          "properties": {
            "helloCodeExecute": {
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
            "v": {
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
      "targetNodeID": "condition_alRhO"
    },
    {
      "sourceNodeID": "code_q6CmU",
      "targetNodeID": "end_0"
    },
    {
      "sourceNodeID": "condition_alRhO",
      "targetNodeID": "code_q6CmU",
      "sourcePortID": "branch_R_7LT"
    },
    {
      "sourceNodeID": "condition_alRhO",
      "targetNodeID": "code_q6CmU",
      "sourcePortID": "else"
    }
  ]
}
