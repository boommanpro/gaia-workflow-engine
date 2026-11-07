/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { generateValidId } from '../utils';
import { registryIcon } from '../node-visuals';
import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import { cloneDefaultData } from '../../agent/node-templates';
import {
  fillCredentialDefaults,
  loadPlatformLlmDefault,
  peekPlatformLlmDefault,
} from './platform-default';
import { formMeta } from './form-meta';

let index = 0;
export const LLMNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.LLM,
  formMeta,
  info: {
    icon: registryIcon(WorkflowNodeType.LLM),
    description:
      'Call the large language model and use variables and prompt words to generate responses.',
  },
  meta: {
    size: {
      width: 300,
      height: 390,
    },
  },
  onAdd() {
    const data: Record<string, any> = { ...cloneDefaultData('llm'), title: `LLM_${++index}` };
    // 共享模板不带凭证（NC-03）；平台默认已缓存时在创建点直接带入（无闪动），
    // 否则由表单打开时的预填补上，并顺手预热缓存
    const cachedDefaults = peekPlatformLlmDefault();
    if (cachedDefaults) {
      fillCredentialDefaults(data.inputsValues, cachedDefaults);
    } else {
      void loadPlatformLlmDefault();
    }
    return {
      id: generateValidId('llm', 5),
      type: 'llm',
      data,
    };
  },
};
