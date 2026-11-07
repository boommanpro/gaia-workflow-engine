/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { registryIcon } from '../node-visuals';
import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';
import { cloneDefaultData } from '../../agent/node-templates';

let index = 0;

export const CodeNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.Code,
  info: {
    icon: registryIcon(WorkflowNodeType.Code),
    description: 'Run the Script',
  },
  meta: {
    size: {
      width: 300,
      height: 390,
    },
  },
  onAdd() {
    return {
      id: generateValidId('code', 5),
      type: 'code',
      data: { ...cloneDefaultData('code'), title: `Code_${++index}` },
    };
  },
  formMeta: formMeta,
};
