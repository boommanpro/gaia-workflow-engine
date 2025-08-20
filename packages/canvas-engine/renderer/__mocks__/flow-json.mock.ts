/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocumentJSON } from '@flowgram.ai/document'

export const flowJson: FlowDocumentJSON = {
  nodes: [
    {
      type: 'start',
      id: 'start',
    },
    {
      type: 'tryCatch',
      id: 'tryCatch_f9fa62fa783',
      blocks: [
        {
          id: 'branch_9fa62fa783d',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_fa62fa783d7',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
          blocks: [
            {
              type: 'createRecord',
              id: 'createRecord_463df50d176',
            },
            {
              type: 'createRecord',
              id: 'createRecord_fb7a69ab5b8',
            },
          ]
        },
        {
          id: 'branch_c57c09b038e',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_7c09b038e0b',
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
      type: 'loop',
      id: 'while_4bd4950692a',
      blocks: [
        {
          id: '$loopBranch$while_4bd4950692a',
          blocks: [
            {
              type: 'createRecord',
              id: 'createRecord_fb7a69ab5b8',
            },
          ]
        },
      ],
    },
    {
      type: 'createRecord',
      id: 'createRecord_6f8cad399fb',
    },
    {
      type: 'loop',
      id: 'forEach_4eeb9f9cde8',
      blocks: [
        {
          id: '$loopBranch$forEach_4eeb9f9cde8',
        },
      ],
    },
    {
      type: 'dynamicSplit',
      id: 'exclusiveSplit_d2bdee4eb90',
      blocks: [
        {
          id: 'branch_008864cf1f9',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_08864cf1f9d',
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
      type: 'createRecord',
      id: 'createRecord_c192e8f6d8d',
    },
    {
      type: 'approval',
      id: 'approval_fc79f9fa62f',
      blocks: [
        {
          id: 'branch_c9c9f0a61f0',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_9c9f0a61f00',
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
      type: 'dynamicSplit',
      id: 'parallelSplit_2e05c1fc79f',
      blocks: [
        {
          id: 'branch_8864cf1f9d3',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_864cf1f9d39',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_64cf1f9d393',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_4cf1f9d3938',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_cf1f9d39381',
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
      type: 'dynamicSplit',
      id: 'exclusiveSplit_d1c021e4362',
      blocks: [
        {
          id: 'branch_a61f008864c',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_61f008864cf',
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
      type: 'dynamicSplit',
      id: 'exclusiveSplit_de37a4886e7',
      blocks: [
        {
          id: 'branch_1f008864cf1',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_f008864cf1f',
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
      type: 'createRecord',
      id: 'createRecord_25ab93c8764',
    },
    {
      type: 'dynamicSplit',
      id: 'exclusiveSplit_15ef1db02e0',
      blocks: [
        {
          id: 'branch_c9f0a61f008',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_9f0a61f0088',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_f0a61f00886',
          meta: {
            size: {
              width: 280,
              height: 28,
            },
          },
        },
        {
          id: 'branch_0a61f008864',
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
      type: 'createRecord',
      id: 'createRecord_fc2f1d9ed41',
    },
    {
      type: 'kunlun_all_all_lark_openapi_im_chats',
      id: 'kunlun_all_all_lark_openapi_im_chats_5dd05c93e4e',
    },
    {
      type: 'kunlun_all_all_byted_bmq_action',
      id: 'kunlun_all_all_byted_bmq_action_f41ff46de8a',
    },
    {
      type: 'kunlun_all_all_lark_openapi_doc_manage',
      id: 'kunlun_all_all_lark_openapi_doc_manage_b789635bc6b',
    },
    {
      type: 'kunlun_all_all_lark_open_spreadsheet',
      id: 'kunlun_all_all_lark_open_spreadsheet_e8a7c39384d',
    },
    {
      type: 'end',
      id: 'end',
    },
  ],
}
