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

export const HTTPNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.HTTP,
  info: {
    icon: registryIcon(WorkflowNodeType.HTTP),
    description: 'Call the HTTP API',
  },
  meta: {
    size: {
      width: 300,
      height: 390,
    },
  },
  onAdd() {
    return {
      id: generateValidId('http', 5),
      type: 'http',
      data: { ...cloneDefaultData('http'), title: `HTTP_${++index}` },
    };
  },
  formMeta: formMeta,
};
