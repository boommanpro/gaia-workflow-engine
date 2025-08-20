/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { IJsonSchema } from '@schema/json-schema';
import { FlowGramNode } from '@node/constant';

interface CodeNodeData {
  title: string;
  inputsValues: Record<string, IFlowValue>;
  inputs: IJsonSchema<'object'>;
  outputs: IJsonSchema<'object'>;
  script: {
    language: 'javascript';
    content: string;
  };
}

export type CodeNodeSchema = WorkflowNodeSchema<FlowGramNode.Code, CodeNodeData>;
