/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowJSON } from "@flowgram.ai/free-layout-core";

export const freeLayout1: WorkflowJSON = {
  "nodes": [
      {
          "id": "start_0",
          "type": "start",
          "meta": {
              "position": {
                  "x": -264,
                  "y": -79
              }
          },
          "data": {}
      },
      {
          "id": "end_0",
          "type": "end",
          "meta": {
              "position": {
                  "x": 1515,
                  "y": -191
              }
          },
          "data": {}
      },
      {
          "id": "base_1",
          "type": "base",
          "meta": {
              "position": {
                  "x": 103.5,
                  "y": -122.5
              }
          }
      },
      {
          "id": "base_2",
          "type": "base",
          "meta": {
              "position": {
                  "x": 525.5,
                  "y": -250.5
              }
          }
      },
      {
          "id": "loop_1",
          "type": "loop",
          "meta": {
              "position": {
                  "x": 541.5,
                  "y": 42.5
              },
              "canvasPosition": {
                  "x": 1154.5,
                  "y": 206.5
              }
          },
          "data": {
              "target": {
                  "meta": {
                      "name": "循环输出_"
                  },
                  "type": "Boolean"
              }
          },
          "blocks": [
              {
                  "id": "base_in_loop_1",
                  "type": "base",
                  "meta": {
                      "position": {
                          "x": 40,
                          "y": 100
                      }
                  }
              },
              {
                  "id": "base_in_loop_2",
                  "type": "base",
                  "meta": {
                      "position": {
                          "x": 62,
                          "y": 299
                      }
                  }
              },
              {
                  "id": "base_in_loop_3",
                  "type": "base",
                  "meta": {
                      "position": {
                          "x": 457,
                          "y": 188
                      }
                  }
              }
          ],
          "edges": [
              {
                  "sourceNodeID": "base_in_loop_1",
                  "targetNodeID": "base_in_loop_3"
              },
              {
                  "sourceNodeID": "base_in_loop_2",
                  "targetNodeID": "base_in_loop_3"
              }
          ]
      },
      {
          "id": "base_3",
          "type": "base",
          "meta": {
              "position": {
                  "x": 1063.5,
                  "y": -52.987060546875
              }
          }
      }
  ],
  "edges": [
      {
          "sourceNodeID": "base_2",
          "targetNodeID": "end_0"
      },
      {
          "sourceNodeID": "base_3",
          "targetNodeID": "end_0"
      },
      {
          "sourceNodeID": "start_0",
          "targetNodeID": "base_1"
      },
      {
          "sourceNodeID": "base_1",
          "targetNodeID": "base_2"
      },
      {
          "sourceNodeID": "base_1",
          "targetNodeID": "loop_1"
      },
      {
          "sourceNodeID": "loop_1",
          "targetNodeID": "base_3",
          "sourcePortID": "loop-output"
      }
  ]
}
