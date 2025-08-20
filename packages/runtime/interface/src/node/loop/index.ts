/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowRefValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { FlowGramNode } from '@node/constant';

interface LoopNodeData {
  title: string;
  loopFor: IFlowRefValue;
  loopOutputs: Record<string, IFlowRefValue>;
}

export type LoopNodeSchema = WorkflowNodeSchema<FlowGramNode.Loop, LoopNodeData>;
