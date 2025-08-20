/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isNil } from 'lodash-es';
import { ConditionOperation } from '@flowgram.ai/runtime-interface';

import { ConditionHandler } from '../type';

export const conditionNumberHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as number;
  // Switch case share scope, so we need to use if else here
  if (operator === ConditionOperation.EQ) {
    const rightValue = condition.rightValue as number;
    return leftValue === rightValue;
  }
  if (operator === ConditionOperation.NEQ) {
    const rightValue = condition.rightValue as number;
    return leftValue !== rightValue;
  }
  if (operator === ConditionOperation.GT) {
    const rightValue = condition.rightValue as number;
    return leftValue > rightValue;
  }
  if (operator === ConditionOperation.GTE) {
    const rightValue = condition.rightValue as number;
    return leftValue >= rightValue;
  }
  if (operator === ConditionOperation.LT) {
    const rightValue = condition.rightValue as number;
    return leftValue < rightValue;
  }
  if (operator === ConditionOperation.LTE) {
    const rightValue = condition.rightValue as number;
    return leftValue <= rightValue;
  }
  if (operator === ConditionOperation.IN) {
    const rightValue = condition.rightValue as number[];
    return rightValue.includes(leftValue);
  }
  if (operator === ConditionOperation.NIN) {
    const rightValue = condition.rightValue as number[];
    return !rightValue.includes(leftValue);
  }
  if (operator === ConditionOperation.IS_EMPTY) {
    return isNil(leftValue);
  }
  if (operator === ConditionOperation.IS_NOT_EMPTY) {
    return !isNil(leftValue);
  }
  return false;
};
