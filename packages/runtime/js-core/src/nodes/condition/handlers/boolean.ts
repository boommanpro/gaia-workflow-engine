/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isNil } from 'lodash-es';
import { ConditionOperator } from '@flowgram.ai/runtime-interface';

import { ConditionHandler } from '../type';

export const conditionBooleanHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as boolean;
  // Switch case share scope, so we need to use if else here
  if (operator === ConditionOperator.EQ) {
    const rightValue = condition.rightValue as boolean;
    return leftValue === rightValue;
  }
  if (operator === ConditionOperator.NEQ) {
    const rightValue = condition.rightValue as boolean;
    return leftValue !== rightValue;
  }
  if (operator === ConditionOperator.IS_TRUE) {
    return leftValue === true;
  }
  if (operator === ConditionOperator.IS_FALSE) {
    return leftValue === false;
  }
  if (operator === ConditionOperator.IN) {
    const rightValue = condition.rightValue as boolean[];
    return rightValue.includes(leftValue);
  }
  if (operator === ConditionOperator.NIN) {
    const rightValue = condition.rightValue as boolean[];
    return !rightValue.includes(leftValue);
  }
  if (operator === ConditionOperator.IS_EMPTY) {
    return isNil(leftValue);
  }
  if (operator === ConditionOperator.IS_NOT_EMPTY) {
    return !isNil(leftValue);
  }
  return false;
};
