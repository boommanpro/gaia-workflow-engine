/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocumentJSON } from '@flowgram.ai/document';

export const fixLayout1: FlowDocumentJSON = {
  nodes: [
    {
      type: 'start',
      meta: {
        isStart: true,
      },
      id: 'start',
    },
    {
      type: 'getRecords',
      id: 'getRecords_07e97c55832',
    },
    {
      type: 'loop',
      id: 'forEach_260a8f85ff2',
      blocks: [
        {
          type: 'createRecord',
          id: 'createRecord_8f85ff2c11d',
        },
        {
          type: 'dynamicSplit',
          id: 'exclusiveSplit_ff2c11d0fb4',
          blocks: [
            {
              id: 'branch_f2c11d0fb42',
            },
            {
              id: 'branch_2c11d0fb42c',
            },
          ],
        },
      ],
    },
    {
      type: 'dynamicSplit',
      id: 'exclusiveSplit_88dbf2c60ae',
      meta: {
        defaultExpanded: true,
      },
      blocks: [
        {
          id: 'branch_8dbf2c60aee',
          blocks: [
            {
              type: 'dynamicSplit',
              id: 'exclusiveSplit_a59afaadc9a',
              blocks: [
                {
                  id: 'branch_59afaadc9ac',
                },
                {
                  id: 'branch_9afaadc9acd',
                  blocks: [
                    {
                      type: 'deleteRecords',
                      id: 'deleteRecords_c32807e97c5',
                    },
                  ]
                },
              ],
            },
          ]
        },
        {
          id: 'branch_dbf2c60aee4',
          blocks: [
            {
              type: 'updateRecords',
              id: 'updateRecords_7ed2a172c32',
            },
          ]
        },
      ],
    },
    {
      type: 'end',
      id: 'end',
    },
  ],
};
