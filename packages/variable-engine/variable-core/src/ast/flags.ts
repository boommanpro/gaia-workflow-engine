/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum ASTNodeFlags {
  None = 0,

  /**
   * 变量字段
   */
  VariableField = 1 << 0,

  /**
   * 表达式
   */
  Expression = 1 << 2,

  /**
   * 变量类型
   */
  BasicType = 1 << 3, // 基础类型
  DrilldownType = 1 << 4, // 可下钻的变量类型
  EnumerateType = 1 << 5, // 可遍历的变量类型
  UnionType = 1 << 6, // 复合类型，暂时不存在

  VariableType = BasicType | DrilldownType | EnumerateType | UnionType,
}
