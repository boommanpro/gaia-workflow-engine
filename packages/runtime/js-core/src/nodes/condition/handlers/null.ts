import { isNil } from 'lodash-es';

import { ConditionHandler, ConditionOperation } from '../type';

export const conditionNullHandler: ConditionHandler = (condition) => {
  const { operator } = condition;
  const leftValue = condition.leftValue as unknown | null;
  // Switch case share scope, so we need to use if else here
  if (operator === ConditionOperation.EQ) {
    return isNil(leftValue) && isNil(condition.rightValue);
  }
  if (operator === ConditionOperation.IS_EMPTY) {
    return isNil(leftValue);
  }
  if (operator === ConditionOperation.IS_NOT_EMPTY) {
    return !isNil(leftValue);
  }
  return false;
};
