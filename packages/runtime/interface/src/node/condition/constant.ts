/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum ConditionOperator {
  /** Equal */
  EQ = 'eq',
  /** Not Equal */
  NEQ = 'neq',
  /** Greater Than */
  GT = 'gt',
  /** Greater Than or Equal */
  GTE = 'gte',
  /** Less Than */
  LT = 'lt',
  /** Less Than or Equal */
  LTE = 'lte',
  /** In */
  IN = 'in',
  /** Not In */
  NIN = 'nin',
  /** Contains */
  CONTAINS = 'contains',
  /** Not Contains */
  NOT_CONTAINS = 'not_contains',
  /** Is Empty */
  IS_EMPTY = 'is_empty',
  /** Is Not Empty */
  IS_NOT_EMPTY = 'is_not_empty',
  /** Is True */
  IS_TRUE = 'is_true',
  /** Is False */
  IS_FALSE = 'is_false',
}
