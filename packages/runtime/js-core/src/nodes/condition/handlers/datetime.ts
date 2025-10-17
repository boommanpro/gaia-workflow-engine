/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isNil } from 'lodash-es';
import { ConditionOperator } from '@flowgram.ai/runtime-interface';

import { ConditionHandler } from '../type';

// Convert ISO string to Date object for comparison
const parseDateTime = (value: string | Date): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

export const conditionDateTimeHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as string;

  // Handle empty checks first
  if (operator === ConditionOperator.IS_EMPTY) {
    return isNil(leftValue);
  }
  if (operator === ConditionOperator.IS_NOT_EMPTY) {
    return !isNil(leftValue);
  }

  // For comparison operations, parse both datetime values
  const leftTime = parseDateTime(leftValue).getTime();
  const rightValue = condition.rightValue as string;
  const rightTime = parseDateTime(rightValue).getTime();

  if (operator === ConditionOperator.EQ) {
    return leftTime === rightTime;
  }
  if (operator === ConditionOperator.NEQ) {
    return leftTime !== rightTime;
  }
  if (operator === ConditionOperator.GT) {
    return leftTime > rightTime;
  }
  if (operator === ConditionOperator.GTE) {
    return leftTime >= rightTime;
  }
  if (operator === ConditionOperator.LT) {
    return leftTime < rightTime;
  }
  if (operator === ConditionOperator.LTE) {
    return leftTime <= rightTime;
  }

  return false;
};
