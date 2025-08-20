/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeSchema } from '@schema/node';
import { IJsonSchema } from '@schema/json-schema';
import { FlowGramNode } from '@node/constant';

interface StartNodeData {
  title: string;
  outputs: IJsonSchema<'object'>;
}

export type StartNodeSchema = WorkflowNodeSchema<FlowGramNode.Start, StartNodeData>;
