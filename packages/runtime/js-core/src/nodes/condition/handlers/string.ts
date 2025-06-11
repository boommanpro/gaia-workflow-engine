import { isNil } from 'lodash-es';

import { ConditionHandler, ConditionOperation } from '../type';

export const conditionStringHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as string;
  // Switch case share scope, so we need to use if else here
  if (operator === ConditionOperation.EQ) {
    const rightValue = condition.rightValue as string;
    return leftValue === rightValue;
  }
  if (operator === ConditionOperation.NEQ) {
    const rightValue = condition.rightValue as string;
    return leftValue !== rightValue;
  }
  if (operator === ConditionOperation.CONTAINS) {
    const rightValue = condition.rightValue as string;
    return leftValue.includes(rightValue);
  }
  if (operator === ConditionOperation.NOT_CONTAINS) {
    const rightValue = condition.rightValue as string;
    return !leftValue.includes(rightValue);
  }
  if (operator === ConditionOperation.IN) {
    const rightValue = condition.rightValue as string[];
    return rightValue.includes(leftValue);
  }
  if (operator === ConditionOperation.NIN) {
    const rightValue = condition.rightValue as string[];
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
