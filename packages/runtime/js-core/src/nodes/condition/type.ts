import {
  WorkflowVariableType,
  IFlowConstantRefValue,
  IFlowRefValue,
} from '@flowgram.ai/runtime-interface';

export enum ConditionOperation {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  IN = 'in',
  NIN = 'nin',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IS_TRUE = 'is_true',
  IS_FALSE = 'is_false',
}

export interface ConditionItem {
  key: string;
  value: {
    left: IFlowRefValue;
    operator: ConditionOperation;
    right: IFlowConstantRefValue;
  };
}

export type Conditions = ConditionItem[];

export type ConditionRule = Partial<Record<ConditionOperation, WorkflowVariableType | null>>;

export type ConditionRules = Record<WorkflowVariableType, ConditionRule>;

export interface ConditionValue {
  key: string;
  leftValue: unknown | null;
  rightValue: unknown | null;
  leftType: WorkflowVariableType;
  rightType: WorkflowVariableType;
  operator: ConditionOperation;
}

export type ConditionHandler = (condition: ConditionValue) => boolean;

export type ConditionHandlers = Record<WorkflowVariableType, ConditionHandler>;
