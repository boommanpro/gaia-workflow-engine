/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowDocumentJSON } from '../src';

export const baseMock: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
    },
    {
      id: 'dynamicSplit_0',
      type: 'dynamicSplit',
      blocks: [{ id: 'block_0' }, { id: 'block_1' }],
    },
    {
      id: 'end_0',
      type: 'end',
    },
  ],
};

export const baseMockAddNode: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
    },
    {
      id: 'dynamicSplit_0',
      type: 'dynamicSplit',
      blocks: [{ id: 'block_0' }, { id: 'block_1', blocks: [{ id: 'noop_0', type: 'noop' }] }],
    },
    {
      id: 'end_0',
      type: 'end',
    },
  ],
};

export const baseMockAddBranch: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
    },
    {
      id: 'dynamicSplit_0',
      type: 'dynamicSplit',
      blocks: [
        { id: 'block_0' },
        { id: 'block_1', blocks: [{ id: 'noop_0', type: 'noop' }] },
        { id: 'block_2' },
      ],
    },
    {
      id: 'end_0',
      type: 'end',
    },
  ],
};
export const baseMockNodeEnd2: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
    },
    {
      id: 'split',
      type: 'dynamicSplit',
      blocks: [
        {
          id: 'branch_0',
          blocks: [
            {
              id: 'endbL5T2',
              type: 'end',
            },
          ],
        },
        {
          id: 'branch_1',
          blocks: [
            {
              id: 'dynamicSplitcxIBv',
              type: 'dynamicSplit',
              blocks: [
                {
                  id: '8ZFL8',
                  blocks: [
                    {
                      id: 'enddQN1D',
                      type: 'end',
                    },
                  ],
                },
                {
                  id: 'vo83H',
                },
              ],
            },
            {
              id: 'endT3VLX',
              type: 'end',
            },
          ],
        },
        {
          id: '_sJEq',
        },
      ],
    },
    {
      id: 'staticSplitHLvrh',
      type: 'staticSplit',
      blocks: [
        {
          id: 'fPE-N',
        },
        {
          id: 'ulpHV',
        },
      ],
    },
    {
      id: 'end_0',
      type: 'end',
    },
  ],
};

export const baseMockNodeEnd: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
    },
    {
      id: 'dynamicSplit_0',
      type: 'dynamicSplit',
      blocks: [
        { id: 'block_0', blocks: [{ id: 'noop_0', meta: { isNodeEnd: true }, type: 'end' }] },
        { id: 'block_1', blocks: [{ id: 'noop_1', meta: { isNodeEnd: true }, type: 'end' }] },
      ],
    },
    {
      id: 'end_0',
      type: 'end',
      blocks: [],
    },
  ],
};
