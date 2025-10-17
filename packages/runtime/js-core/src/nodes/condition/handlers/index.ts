/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowVariableType } from '@flowgram.ai/runtime-interface';

import { ConditionHandlers } from '../type';
import { conditionStringHandler } from './string';
import { conditionObjectHandler } from './object';
import { conditionNumberHandler } from './number';
import { conditionNullHandler } from './null';
import { conditionMapHandler } from './map';
import { conditionDateTimeHandler } from './datetime';
import { conditionBooleanHandler } from './boolean';
import { conditionArrayHandler } from './array';

export const conditionHandlers: ConditionHandlers = {
  [WorkflowVariableType.String]: conditionStringHandler,
  [WorkflowVariableType.Number]: conditionNumberHandler,
  [WorkflowVariableType.Integer]: conditionNumberHandler,
  [WorkflowVariableType.Boolean]: conditionBooleanHandler,
  [WorkflowVariableType.Object]: conditionObjectHandler,
  [WorkflowVariableType.Map]: conditionMapHandler,
  [WorkflowVariableType.Array]: conditionArrayHandler,
  [WorkflowVariableType.DateTime]: conditionDateTimeHandler,
  [WorkflowVariableType.Null]: conditionNullHandler,
};
