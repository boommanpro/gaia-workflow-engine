/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * Flow reference value schema - references a variable
 */
export interface FlowRefValueSchema {
  type: 'ref' | 'expression';
  content: string;
}

/**
 * Flow literal value schema - a constant value
 */
export interface FlowLiteralValueSchema {
  type: 'literal';
  content: string;
}
