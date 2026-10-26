/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { generateValidId } from '../utils';
import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import iconLLM from '../../assets/icon-llm.jpg';
import { cloneDefaultData } from '../../agent/node-templates';
import { formMeta } from './form-meta';

let index = 0;
export const LLMNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.LLM,
  formMeta,
  info: {
    icon: iconLLM,
    description:
      'Call the large language model and use variables and prompt words to generate responses.',
  },
  meta: {
    size: {
      width: 360,
      height: 390,
    },
  },
  onAdd() {
    return {
      id: generateValidId('llm', 5),
      type: 'llm',
      data: { ...cloneDefaultData('llm'), title: `LLM_${++index}` },
    };
  },
};
