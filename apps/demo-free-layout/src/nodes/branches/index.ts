/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { FlowNodeRegistry } from '../../typings';
import iconCondition from '../../assets/icon-condition.svg';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';
import { WorkflowNodeType } from '../constants';

export const BranchNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Branches,
  info: {
    icon: iconCondition,
    description:
      'Connect multiple downstream branches. Only the corresponding branch will be executed if the set conditions are met.',
  },
  meta: {
    defaultPorts: [{ type: 'input' }],
    // Condition Outputs use dynamic port
    useDynamicPort: true,
    expandable: false, // disable expanded
    size: {
      width: 360,
      height: 210,
    },
  },
  formMeta,
  onAdd() {
    return {
      id: generateValidId('branches', 5),
      type: 'branches',
      data: {
        title: 'Branches',
        branches: [
          {
            id: generateValidId('branch', 5),
            title: 'Branch 1',
            logic: 'and',
            conditions: [
              {
                key: generateValidId('if', 6),
                value: { type: 'expression', content: '' },
              },
            ],
          },
        ],
      },
    };
  },
};
