/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { registryIcon } from '../node-visuals';
import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';

let index = 0;

export const VariableNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Variable,
  info: {
    icon: registryIcon(WorkflowNodeType.Variable),
    description: 'Variable Assign and Declaration',
  },
  meta: {
    size: {
      width: 300,
      height: 390,
    },
  },
  onAdd() {
    return {
      id: generateValidId('variable', 5),
      type: 'variable',
      data: {
        title: `Variable_${++index}`,
        assign: [
          {
            operator: 'declare',
            left: 'sum',
            right: {
              type: 'constant',
              content: 0,
              schema: { type: 'integer' },
            },
          },
        ],
      },
    };
  },
  formMeta: formMeta,
};
