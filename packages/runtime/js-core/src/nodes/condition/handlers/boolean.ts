import { isNil } from 'lodash-es';

import { ConditionHandler, ConditionOperation } from '../type';

export const conditionBooleanHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as boolean;
  // Switch case share scope, so we need to use if else here
  if (operator === ConditionOperation.EQ) {
    const rightValue = condition.rightValue as boolean;
    return leftValue === rightValue;
  }
  if (operator === ConditionOperation.NEQ) {
    const rightValue = condition.rightValue as boolean;
    return leftValue !== rightValue;
  }
  if (operator === ConditionOperation.IS_TRUE) {
    return leftValue === true;
  }
  if (operator === ConditionOperation.IS_FALSE) {
    return leftValue === false;
  }
  if (operator === ConditionOperation.IN) {
    const rightValue = condition.rightValue as boolean[];
    return rightValue.includes(leftValue);
  }
  if (operator === ConditionOperation.NIN) {
    const rightValue = condition.rightValue as boolean[];
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
