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
import { fillCredentialDefaults, loadPlatformLlmDefault, peekPlatformLlmDefault } from './platform-default';

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
