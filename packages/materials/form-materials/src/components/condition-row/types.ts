/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IFlowConstantRefValue, IFlowRefValue } from '@/shared';

export interface ConditionRowValueType {
  left?: IFlowRefValue;
  operator?: string;
  right?: IFlowConstantRefValue;
}
