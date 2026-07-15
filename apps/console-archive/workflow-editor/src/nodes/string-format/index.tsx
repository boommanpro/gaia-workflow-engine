/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';

import { WorkflowNodeType } from '../constants';
import { FlowNodeRegistry } from '../../typings';
import iconCode from '../../assets/icon-script.png';
import { formMeta } from './form-meta';
import { generateValidId } from '../utils';

let index = 0;

const defaultTemplate = `<!-- 
Here you can use input variables in the template.
Input variables can be accessed using the 'params' object.
Example of getting the value of the parameter named 'input' from the node input:
\${params.input}

Supported template languages:
1. SpEL(Standard) - Spring Expression Language
2. SpEL(Vue) - Spring Expression Language for Vue
3. ThymeLeaf(Text) - Thymeleaf template engine
-->`;

export const StringFormatNodeRegistry: FlowNodeRegistry = {
  type: WorkflowNodeType.StringFormat,
  info: {
    icon: iconCode,
    description: 'String Format',
  },
  meta: {
    size: {
      width: 360,
      height: 390,
    },
  },
  onAdd() {
    return {
      id: generateValidId('string_format', 5),
      type: 'string-format',
      data: {
        title: `StringFormat_${++index}`,
        inputsValues: {
          input: { type: 'constant', content: '' },
        },
        script: {
          language: 'spel-standard',
          content: defaultTemplate,
        },
        outputs: {
          type: 'object',
          properties: {
            formatStringResult: {
              type: 'string',
            },
          },
        },
      },
    };
  },
  formMeta: formMeta,
};
