import { WorkflowVariableType } from '@flowgram.ai/runtime-interface';

import { ConditionOperation, ConditionRules } from './type';

export const conditionRules: ConditionRules = {
  [WorkflowVariableType.String]: {
    [ConditionOperation.EQ]: WorkflowVariableType.String,
    [ConditionOperation.NEQ]: WorkflowVariableType.String,
    [ConditionOperation.CONTAINS]: WorkflowVariableType.String,
    [ConditionOperation.NOT_CONTAINS]: WorkflowVariableType.String,
    [ConditionOperation.IN]: WorkflowVariableType.Array,
    [ConditionOperation.NIN]: WorkflowVariableType.Array,
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.String,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.String,
  },
  [WorkflowVariableType.Number]: {
    [ConditionOperation.EQ]: WorkflowVariableType.Number,
    [ConditionOperation.NEQ]: WorkflowVariableType.Number,
    [ConditionOperation.GT]: WorkflowVariableType.Number,
    [ConditionOperation.GTE]: WorkflowVariableType.Number,
    [ConditionOperation.LT]: WorkflowVariableType.Number,
    [ConditionOperation.LTE]: WorkflowVariableType.Number,
    [ConditionOperation.IN]: WorkflowVariableType.Array,
    [ConditionOperation.NIN]: WorkflowVariableType.Array,
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.Null,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.Null,
  },
  [WorkflowVariableType.Integer]: {
    [ConditionOperation.EQ]: WorkflowVariableType.Integer,
    [ConditionOperation.NEQ]: WorkflowVariableType.Integer,
    [ConditionOperation.GT]: WorkflowVariableType.Integer,
    [ConditionOperation.GTE]: WorkflowVariableType.Integer,
    [ConditionOperation.LT]: WorkflowVariableType.Integer,
    [ConditionOperation.LTE]: WorkflowVariableType.Integer,
    [ConditionOperation.IN]: WorkflowVariableType.Array,
    [ConditionOperation.NIN]: WorkflowVariableType.Array,
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.Null,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.Null,
  },
  [WorkflowVariableType.Boolean]: {
    [ConditionOperation.EQ]: WorkflowVariableType.Boolean,
    [ConditionOperation.NEQ]: WorkflowVariableType.Boolean,
    [ConditionOperation.IS_TRUE]: WorkflowVariableType.Null,
    [ConditionOperation.IS_FALSE]: WorkflowVariableType.Null,
    [ConditionOperation.IN]: WorkflowVariableType.Array,
    [ConditionOperation.NIN]: WorkflowVariableType.Array,
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.Null,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.Null,
  },
  [WorkflowVariableType.Object]: {
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.Null,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.Null,
  },
  [WorkflowVariableType.Array]: {
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.Null,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.Null,
  },
  [WorkflowVariableType.Null]: {
    [ConditionOperation.EQ]: WorkflowVariableType.Null,
    [ConditionOperation.IS_EMPTY]: WorkflowVariableType.Null,
    [ConditionOperation.IS_NOT_EMPTY]: WorkflowVariableType.Null,
  },
};
