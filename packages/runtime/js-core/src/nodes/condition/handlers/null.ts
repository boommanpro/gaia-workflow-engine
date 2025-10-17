/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isNil } from 'lodash-es';
import { ConditionOperator } from '@flowgram.ai/runtime-interface';

import { ConditionHandler } from '../type';

export const conditionNullHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as unknown | null;
  // Switch case share scope, so we need to use if else here
  if (operator === ConditionOperator.EQ) {
    return isNil(leftValue) && isNil(condition.rightValue);
  }
  if (operator === ConditionOperator.IS_EMPTY) {
    return isNil(leftValue);
  }
  if (operator === ConditionOperator.IS_NOT_EMPTY) {
    return !isNil(leftValue);
  }
  return false;
};
