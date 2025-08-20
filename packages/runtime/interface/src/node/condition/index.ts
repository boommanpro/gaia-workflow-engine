/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowConstantRefValue, IFlowRefValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { FlowGramNode } from '@node/constant';
import { ConditionOperation } from './constant';

export { ConditionOperation };

export interface ConditionItem {
  key: string;
  value: {
    left: IFlowRefValue;
    operator: ConditionOperation;
    right: IFlowConstantRefValue;
  };
}

interface ConditionNodeData {
  title: string;
  conditions: ConditionItem[];
}

export type ConditionNodeSchema = WorkflowNodeSchema<FlowGramNode.Condition, ConditionNodeData>;
