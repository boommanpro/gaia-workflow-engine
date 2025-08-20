import { IFlowConstantRefValue, IFlowRefValue, JsonSchemaBasicType } from '../../typings';

export enum Op {
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

export interface OpConfig {
  label: string;
  abbreviation: string;
  // When right is not a value, display this text
  rightDisplay?: string;
}

export type OpConfigs = Record<Op, OpConfig>;

export type IRule = Partial<Record<Op, JsonSchemaBasicType | null>>;

export type IRules = Record<JsonSchemaBasicType, IRule>;

export interface ConditionRowValueType {
  left?: IFlowRefValue;
  operator?: Op;
  right?: IFlowConstantRefValue;
}
