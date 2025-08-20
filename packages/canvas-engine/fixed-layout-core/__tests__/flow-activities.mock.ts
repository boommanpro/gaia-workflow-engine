/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Container, type interfaces } from 'inversify';
import {
  FlowDocumentContainerModule,
  FlowNodeRegistry,
  type FlowDocumentJSON,
} from '@flowgram.ai/document';
import { EntityManager } from '@flowgram.ai/core';

import { FixedLayoutContainerModule } from '../src/fixed-layout-container-module';

export function createDocumentContainer(): interfaces.Container {
  const container = new Container();
  container.load(FlowDocumentContainerModule);
  container.load(FixedLayoutContainerModule);
  container.bind(EntityManager).toSelf();
  return container;
}

export const dynamicSplitMock: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      blocks: [],
    },
    {
      id: 'split',
      type: 'dynamicSplit',
      blocks: [{ id: 'branch_0' }, { id: 'branch_1', blocks: [{ id: 'noop_0', type: 'noop' }] }],
    },
    {
      id: 'end_0',
      type: 'end',
      blocks: [],
    },
  ],
};

export const dynamicSplitEmptyMock: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      blocks: [],
    },
    {
      id: 'empty-split',
      type: 'dynamicSplit',
      blocks: [],
    },
    {
      id: 'end_0',
      type: 'end',
      blocks: [],
    },
  ],
};

export const dynamicSplitExpandedMock: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      blocks: [],
    },
    {
      id: 'split',
      type: 'dynamicSplit',
      blocks: [
        {
          id: 'branch_0',
        },
        {
          id: 'branch_1',
          blocks: [
            { id: 'noop_0', type: 'noop' },
            {
              id: 'split2',
              type: 'dynamicSplit',
              blocks: [
                { id: 's2_branch_0', meta: { defaultExpanded: true } },
                { id: 's2_branch_1' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'end_0',
      type: 'end',
      blocks: [],
    },
  ],
};
export const tryCatchMock: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start',
      type: 'start',
      blocks: [],
    },
    {
      id: 'tryCatch',
      type: 'tryCatch',
      blocks: [
        { id: 'try_branch_0', blocks: [{ id: 'try_noop_0', type: 'noop' }] },
        { id: 'catch_branch_1', blocks: [{ id: 'catch_noop_0', type: 'noop' }] },
        { id: 'catch_branch_2' },
        { id: 'catch_branch_3' },
      ],
    },
    {
      id: 'end',
      type: 'end',
      blocks: [],
    },
  ],
};
export const loopEmpty: FlowDocumentJSON = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      blocks: [],
    },
    {
      id: 'loop_0',
      type: 'loop',
      blocks: [],
    },
    {
      id: 'end_0',
      type: 'end',
      blocks: [],
    },
  ],
};

export const extendChildNodeMock: FlowNodeRegistry = {
  type: 'test-extend',
  extend: 'dynamicSplit',
  extendChildRegistries: [
    {
      type: 'block',
      addChild(node, json, options = {}) {
        const { index } = options;
        const document = node.document;
        return document.addNode({
          ...json,
          ...options,
          parent: node,
          index,
        });
      },
    },
  ],
};
