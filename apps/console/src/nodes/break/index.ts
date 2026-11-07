/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { registryIcon } from '../node-visuals';
import { FlowNodeRegistry } from '../../typings';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';
import { WorkflowNodeType } from '../constants';

let index = 0;
export const BreakNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Break,
  meta: {
    defaultPorts: [{ type: 'input' }],
    sidebarDisabled: true,
    size: {
      width: 300,
      height: 54,
    },
    expandable: false,
    onlyInContainer: WorkflowNodeType.Loop,
  },
  info: {
    icon: registryIcon(WorkflowNodeType.Break),
    description:
      'The final node of the workflow, used to return the result information after the workflow is run.',
  },
  /**
   * Render node via formMeta
   */
  formMeta,
  onAdd() {
    return {
      id: generateValidId('break', 5),
      type: 'break',
      data: {
        title: `Break_${++index}`,
      },
    };
  },
};
