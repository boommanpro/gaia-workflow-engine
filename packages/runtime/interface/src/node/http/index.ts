/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowConstantRefValue, IFlowTemplateValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { IJsonSchema } from '@schema/json-schema';
import { FlowGramNode } from '@node/constant';
import { HTTPBodyType, HTTPMethod } from './constant';

interface HTTPNodeData {
  title: string;
  outputs: IJsonSchema<'object'>;
  api: {
    method: HTTPMethod;
    url: IFlowTemplateValue;
  };
  headers: IJsonSchema<'object'>;
  headersValues: Record<string, IFlowConstantRefValue>;
  params: IJsonSchema<'object'>;
  paramsValues: Record<string, IFlowConstantRefValue>;
  body: {
    bodyType: HTTPBodyType;
    json?: IFlowTemplateValue;
    formData?: IJsonSchema<'object'>;
    formDataValues?: Record<string, IFlowConstantRefValue>;
    rawText?: IFlowTemplateValue;
    binary?: IFlowTemplateValue;
    xWwwFormUrlencoded?: IJsonSchema<'object'>;
    xWwwFormUrlencodedValues?: Record<string, IFlowConstantRefValue>;
  };
  timeout: {
    retryTimes: number;
    timeout: number;
  };
}
export { HTTPMethod, HTTPBodyType };
export type HTTPNodeSchema = WorkflowNodeSchema<FlowGramNode.HTTP, HTTPNodeData>;
