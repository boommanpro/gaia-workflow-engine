/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {FlowDocumentJSON} from './typings';

export const initialData: FlowDocumentJSON = {
    "nodes": [
        {
            "id": "start_0",
            "type": "start",
            "meta": {
                "position": {
                    "x": 169.7185981072503,
                    "y": 428.89977615151935
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
                                "type": "integer"
                            },
                            "default": "[1,2,3]"
                        }
                    },
                    "required": []
                }
            }
        },
        {
            "id": "end_0",
            "type": "end",
            "meta": {
                "position": {
                    "x": 3959.969813249248,
                    "y": 416.3997761515193
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
                    "ai_loop_user": {
                        "type": "ref",
                        "content": [
                            "loop_TC60x",
                            "user"
                        ],
                        "extra": {
                            "index": 2
                        }
                    },
                    "cleanUser": {
                        "type": "ref",
                        "content": [
                            "code_azggU",
                            "users"
                        ],
                        "extra": {
                            "index": 3
                        }
                    },
                    "format": {
                        "type": "ref",
                        "content": [
                            "string_format_j_zgL",
                            "formatStringResult"
                        ]
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
                        "ai_loop_user": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "cleanUser": {
                            "type": "object",
                            "required": [],
                            "properties": {}
                        },
                        "format": {
                            "type": "string"
                        }
                    }
                }
            }
        },
        {
            "id": "loop_TC60x",
            "type": "loop",
            "meta": {
                "position": {
                    "x": 579.0693271924488,
                    "y": 134.8242709148014
                }
            },
            "data": {
                "title": "Loop_1",
                "loopFor": {
                    "type": "ref",
                    "content": [
                        "start_0",
                        "array_obj"
                    ]
                },
                "loopOutputs": {
                    "user": {
                        "type": "ref",
                        "content": [
                            "llm_aO_gu",
                            "result"
                        ]
                    },
                    "llm2": {
                        "type": "ref",
                        "content": [
                            "llm_kMoRm",
                            "result"
                        ]
                    }
                },
                "outputs": {
                    "type": "object",
                    "required": [],
                    "properties": {
                        "user": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "llm2": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    }
                }
            },
            "blocks": [
                {
                    "id": "block_start_O0kbZ",
                    "type": "block-start",
                    "meta": {
                        "position": {
                            "x": 32,
                            "y": 386.57394473203993
                        }
                    },
                    "data": {}
                },
                {
                    "id": "block_end_CDMp3",
                    "type": "block-end",
                    "meta": {
                        "position": {
                            "x": 2011.3246354574007,
                            "y": 531.4010104734359
                        }
                    },
                    "data": {}
                },
                {
                    "id": "condition_E0X5H",
                    "type": "condition",
                    "meta": {
                        "position": {
                            "x": 779.3246354574007,
                            "y": 433.6510104734359
                        }
                    },
                    "data": {
                        "title": "Condition",
                        "conditions": [
                            {
                                "value": {
                                    "left": {
                                        "type": "ref",
                                        "content": [
                                            "llm_aO_gu",
                                            "result"
                                        ]
                                    },
                                    "operator": "is_empty"
                                },
                                "key": "if_OqGme"
                            },
                            {
                                "value": {
                                    "type": "expression",
                                    "content": "",
                                    "left": {
                                        "type": "ref",
                                        "content": [
                                            "loop_TC60x_locals",
                                            "index"
                                        ]
                                    },
                                    "operator": "gte",
                                    "right": {
                                        "type": "constant",
                                        "content": 0,
                                        "schema": {
                                            "type": "number"
                                        }
                                    }
                                },
                                "key": "if_brnoNs"
                            }
                        ]
                    }
                },
                {
                    "id": "llm_aO_gu",
                    "type": "llm",
                    "meta": {
                        "position": {
                            "x": 300.81811205045125,
                            "y": 148.50461753959107
                        }
                    },
                    "data": {
                        "title": "LLM_1",
                        "inputsValues": {
                            "modelName": {
                                "type": "constant",
                                "content": "qwen/qwen3-4b-2507",
                                "schema": {
                                    "type": "string"
                                }
                            },
                            "apiKey": {
                                "type": "constant",
                                "content": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            },
                            "apiHost": {
                                "type": "constant",
                                "content": "http://localhost:1234/v1",
                                "schema": {
                                    "type": "string"
                                }
                            },
                            "temperature": {
                                "type": "constant",
                                "content": 0.5
                            },
                            "systemPrompt": {
                                "type": "template",
                                "content": "# Role\nYou are an AI assistant.\n"
                            },
                            "prompt": {
                                "type": "template",
                                "content": "请返回一个用户的json结构，仅返回json数据即可，注意包含city、name、job、age"
                            }
                        },
                        "inputs": {
                            "type": "object",
                            "required": [
                                "modelName",
                                "apiKey",
                                "apiHost",
                                "temperature",
                                "prompt"
                            ],
                            "properties": {
                                "modelName": {
                                    "type": "string"
                                },
                                "apiKey": {
                                    "type": "string"
                                },
                                "apiHost": {
                                    "type": "string"
                                },
                                "temperature": {
                                    "type": "number"
                                },
                                "systemPrompt": {
                                    "type": "string",
                                    "extra": {
                                        "formComponent": "prompt-editor"
                                    }
                                },
                                "prompt": {
                                    "type": "string",
                                    "extra": {
                                        "formComponent": "prompt-editor"
                                    }
                                }
                            }
                        },
                        "outputs": {
                            "type": "object",
                            "properties": {
                                "result": {
                                    "type": "string"
                                }
                            }
                        }
                    }
                },
                {
                    "id": "llm_kMoRm",
                    "type": "llm",
                    "meta": {
                        "position": {
                            "x": 1269.5046399368532,
                            "y": 32.82303337554171
                        }
                    },
                    "data": {
                        "title": "LLM_2",
                        "inputsValues": {
                            "modelName": {
                                "type": "constant",
                                "content": "qwen/qwen3-4b-2507",
                                "schema": {
                                    "type": "string"
                                }
                            },
                            "apiKey": {
                                "type": "constant",
                                "content": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            },
                            "apiHost": {
                                "type": "constant",
                                "content": "http://localhost:1234/v1",
                                "schema": {
                                    "type": "string"
                                }
                            },
                            "temperature": {
                                "type": "constant",
                                "content": 0.5
                            },
                            "systemPrompt": {
                                "type": "template",
                                "content": "# Role\nYou are an AI assistant.\n"
                            },
                            "prompt": {
                                "type": "template",
                                "content": "你是谁"
                            }
                        },
                        "inputs": {
                            "type": "object",
                            "required": [
                                "modelName",
                                "apiKey",
                                "apiHost",
                                "temperature",
                                "prompt"
                            ],
                            "properties": {
                                "modelName": {
                                    "type": "string"
                                },
                                "apiKey": {
                                    "type": "string"
                                },
                                "apiHost": {
                                    "type": "string"
                                },
                                "temperature": {
                                    "type": "number"
                                },
                                "systemPrompt": {
                                    "type": "string",
                                    "extra": {
                                        "formComponent": "prompt-editor"
                                    }
                                },
                                "prompt": {
                                    "type": "string",
                                    "extra": {
                                        "formComponent": "prompt-editor"
                                    }
                                }
                            }
                        },
                        "outputs": {
                            "type": "object",
                            "properties": {
                                "result": {
                                    "type": "string"
                                }
                            }
                        }
                    }
                },
                {
                    "id": "branches_JiD_w",
                    "type": "branches",
                    "meta": {
                        "position": {
                            "x": 1814.4763366561974,
                            "y": 0
                        }
                    },
                    "data": {
                        "title": "Branches",
                        "branches": [
                            {
                                "id": "branch_T5S5n",
                                "title": "Branch 1",
                                "logic": "and",
                                "conditions": [
                                    {
                                        "value": {
                                            "type": "expression",
                                            "content": "",
                                            "left": {
                                                "type": "ref",
                                                "content": [
                                                    "llm_kMoRm",
                                                    "result"
                                                ]
                                            },
                                            "operator": "is_not_empty"
                                        },
                                        "key": "if_Q6Amr2"
                                    }
                                ]
                            }
                        ]
                    }
                }
            ],
            "edges": [
                {
                    "sourceNodeID": "block_start_O0kbZ",
                    "targetNodeID": "llm_aO_gu"
                },
                {
                    "sourceNodeID": "condition_E0X5H",
                    "targetNodeID": "block_end_CDMp3",
                    "sourcePortID": "else"
                },
                {
                    "sourceNodeID": "branches_JiD_w",
                    "targetNodeID": "block_end_CDMp3",
                    "sourcePortID": "branch_T5S5n"
                },
                {
                    "sourceNodeID": "branches_JiD_w",
                    "targetNodeID": "block_end_CDMp3",
                    "sourcePortID": "else"
                },
                {
                    "sourceNodeID": "llm_aO_gu",
                    "targetNodeID": "condition_E0X5H"
                },
                {
                    "sourceNodeID": "condition_E0X5H",
                    "targetNodeID": "llm_kMoRm",
                    "sourcePortID": "if_OqGme"
                },
                {
                    "sourceNodeID": "condition_E0X5H",
                    "targetNodeID": "llm_kMoRm",
                    "sourcePortID": "if_brnoNs"
                },
                {
                    "sourceNodeID": "llm_kMoRm",
                    "targetNodeID": "branches_JiD_w"
                }
            ]
        },
        {
            "id": "code_azggU",
            "type": "code",
            "meta": {
                "position": {
                    "x": 2994.7316449211494,
                    "y": 421.6497761515193
                }
            },
            "data": {
                "title": "Code_1",
                "inputsValues": {
                    "users": {
                        "type": "ref",
                        "content": [
                            "loop_TC60x",
                            "user"
                        ],
                        "extra": {
                            "index": 0
                        }
                    }
                },
                "script": {
                    "language": "java",
                    "content": "package cn.boommanpro.gaiaworkflow;\n\nimport cn.boommanpro.gaia.workflow.infra.extend.node.code.CodeExecute;\n\nimport java.util.*;\nimport com.fasterxml.jackson.databind.ObjectMapper;\n\npublic class HelloCodeExecute implements CodeExecute {\n    private static final ObjectMapper objectMapper = new ObjectMapper();\n\n    @Override\n    public Map<String, Object> execute(Map<String, Object> inputs) {\n        HashMap<String, Object> result = new HashMap<>();\n\n        try {\n            // 获取user数组\n            Object userObj = inputs.get(\"users\");\n            if (userObj instanceof List) {\n                List<String> userStrings = (List<String>) userObj;\n                List<Object> cleanedUsers = new ArrayList<>();\n\n                for (String userStr : userStrings) {\n                    try {\n                        // 清洗数据：去除```json和```标记\n                        String cleanedStr = cleanJsonString(userStr);\n\n                        // 解析JSON字符串为对象\n                        Object userObject = objectMapper.readValue(cleanedStr, Object.class);\n                        cleanedUsers.add(userObject);\n                    } catch (Exception e) {\n                        // 如果解析失败，可以记录错误或跳过\n                        System.err.println(\"Failed to parse user string: \" + userStr);\n                        e.printStackTrace();\n                    }\n                }\n\n                result.put(\"users\", cleanedUsers);\n            }\n        } catch (Exception e) {\n            System.err.println(\"Error processing user data: \" + e.getMessage());\n            e.printStackTrace();\n        }\n\n        return result;\n    }\n\n    /**\n     * 清洗JSON字符串，去除```json和```标记\n     */\n    private String cleanJsonString(String jsonString) {\n        if (jsonString == null) {\n            return \"\";\n        }\n\n        // 去除开头的```json\n        if (jsonString.startsWith(\"```json\")) {\n            jsonString = jsonString.substring(7).trim();\n        }\n\n        // 去除结尾的```\n        if (jsonString.endsWith(\"```\")) {\n            jsonString = jsonString.substring(0, jsonString.length() - 3).trim();\n        }\n\n        return jsonString;\n    }\n}\n"
                },
                "outputs": {
                    "type": "object",
                    "properties": {
                        "users": {
                            "type": "object"
                        }
                    },
                    "required": []
                },
                "inputs": {
                    "type": "object",
                    "properties": {
                        "users": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        },
        {
            "id": "string_format_j_zgL",
            "type": "string-format",
            "meta": {
                "position": {
                    "x": 3469.125607570999,
                    "y": 421.6497761515193
                }
            },
            "data": {
                "title": "StringFormat_2",
                "inputsValues": {
                    "users": {
                        "type": "ref",
                        "content": [
                            "code_azggU",
                            "users"
                        ],
                        "extra": {
                            "index": 0
                        }
                    }
                },
                "script": {
                    "language": "spel-vue",
                    "content": "城市:{{users[0].city}}\\n\n姓名:{{users[0].name}}\\n\n工作:{{users[0].job}}\\n\n年龄:{{users[0].age}}"
                },
                "outputs": {
                    "type": "object",
                    "properties": {
                        "formatStringResult": {
                            "type": "string"
                        }
                    }
                },
                "inputs": {
                    "type": "object",
                    "properties": {
                        "users": {
                            "type": "object",
                            "required": [],
                            "properties": {}
                        }
                    }
                }
            }
        },
        {
            "id": "assignee_M3j85",
            "type": "assignee",
            "meta": {
                "position": {
                    "x": 1987.8056186134213,
                    "y": -163.89919968547113
                }
            },
            "data": {
                "title": "负责人标记_1",
                "assignees": [],
                "data": {
                    "assignees": [
                        {
                            "id": "1",
                            "name": "zhangsan",
                            "avatar": "https://avatars.githubusercontent.com/u/1?v=4"
                        }
                    ]
                }
            }
        }
    ],
    "edges": [
        {
            "sourceNodeID": "start_0",
            "targetNodeID": "loop_TC60x"
        },
        {
            "sourceNodeID": "string_format_j_zgL",
            "targetNodeID": "end_0"
        },
        {
            "sourceNodeID": "loop_TC60x",
            "targetNodeID": "code_azggU"
        },
        {
            "sourceNodeID": "code_azggU",
            "targetNodeID": "string_format_j_zgL"
        }
    ]
};
