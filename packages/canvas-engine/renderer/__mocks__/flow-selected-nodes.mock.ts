/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export const FLOW_SELECTED_NODES = {
  nodes: [
    {
      id: 'start',
      type: 'start',
      blocks: [],
    },
    {
      id: 'createRecord_613973143a5',
      type: 'createRecord',
      blocks: [],
    },
    {
      id: 'exclusiveSplit_13973143a53',
      type: 'dynamicSplit',
      blocks: [
        {
          id: 'branch_0b5ee7b1189',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_b5ee7b11890',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
      ],
    },
    {
      id: 'exclusiveSplit_30baf8b1da0',
      type: 'dynamicSplit',
      blocks: [
        {
          id: 'branch_33d40b5ee7b',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
          blocks: [
            {
              id: 'createRecord_897b61c55f3',
              type: 'createRecord',
              blocks: [],
            },
          ],
        },
        {
          id: 'branch_3d40b5ee7b1',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
          blocks: [
            {
              id: 'exclusiveSplit_d0070ce5d04',
              type: 'dynamicSplit',
              blocks: [
                {
                  id: 'branch_d40b5ee7b11',
                  meta: {
                    size: {
                      width: 280,
                      height: 28,
                    },
                  },
                  blocks: [
                    {
                      id: 'createRecord_47e8fe1dfc3',
                      type: 'createRecord',
                      blocks: [],
                    },
                    {
                      id: 'createRecord_32dcdd10274',
                      type: 'createRecord',
                      blocks: [],
                    },
                    {
                      id: 'exclusiveSplit_a5579b3997d',
                      type: 'dynamicSplit',
                      blocks: [
                        {
                          id: 'branch_5ee7b11890c',
                          meta: {
                            size: {
                              width: 280,
                              height: 28,
                            },
                          },
                          blocks: [
                            {
                              id: 'createRecord_b57b00eee94',
                              type: 'createRecord',
                              blocks: [],
                            },
                          ],
                        },
                        {
                          id: 'branch_ee7b11890c1',
                          meta: {
                            size: {
                              width: 280,
                              height: 28,
                            },
                          },
                        },
                      ],
                    },
                  ]
                },
                {
                  id: 'branch_40b5ee7b118',
                  meta: {
                    size: {
                      width: 280,
                      height: 28,
                    },
                  },
                  blocks: [
                    {
                      id: 'tryCatch_cb31cd3f34f',
                      type: 'tryCatch',
                      blocks: [
                        {
                          id: 'branch_b31cd3f34fe',
                          blocks: [
                            {
                              id: 'createRecord_a32ff708e68',
                              type: 'createRecord',
                              blocks: [],
                            },
                          ]
                        },
                        {
                          id: 'branch_31cd3f34fec',
                          blocks: [
                            {
                              id: 'createRecord_94cf09ad24b',
                              type: 'createRecord',
                              blocks: [],
                            },
                          ]
                        },
                      ],
                    },
                  ]
                },
              ],
            },
          ]
        },
      ],
    },
    {
      id: 'end',
      type: 'end',
      blocks: [],
    },
  ],
}
