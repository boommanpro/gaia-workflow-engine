/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowConstantRefValue, IFlowConstantValue, IFlowTemplateValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { IJsonSchema } from '@schema/json-schema';
import { FlowGramNode } from '@node/constant';

interface LLMNodeData {
  title: string;
  inputs: IJsonSchema<'object'>;
  outputs: IJsonSchema<'object'>;
  inputValues: {
    apiKey: IFlowConstantRefValue;
    modelType: IFlowConstantRefValue;
    baseURL: IFlowConstantRefValue;
    temperature: IFlowConstantRefValue;
    systemPrompt: IFlowConstantValue | IFlowTemplateValue;
    prompt: IFlowConstantValue | IFlowTemplateValue;
  };
}

export type LLMNodeSchema = WorkflowNodeSchema<FlowGramNode.LLM, LLMNodeData>;
