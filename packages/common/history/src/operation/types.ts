/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { StackOperation } from '../history';

/**
 * 操作
 */
export interface Operation<OperationValue = unknown> {
  /**
   * 操作的类型 如insert_node, move_node等
   */
  type: string;
  /**
   * 操作的值 外部自定义
   */
  value: OperationValue;
  /**
   * 资源唯一标志
   */
  uri?: string;
  /**
   * 操作触发源头
   */
  origin?: string | Symbol;
}

export type OperationWithId = Operation & { id: string };

/**
 * push操作配置
 */
export interface PushOperationOptions {
  noApply?: boolean;
}

/**
 * 操作历史
 */
export interface HistoryOperation extends Operation {
  /**
   * 唯一id
   */
  id: string;
  /**
   * 显示名称
   */
  label?: string;
  /**
   * 描述
   */
  description?: string;
  /**
   * 时间戳
   */
  timestamp: number;
}

/**
 * 操作元数据
 */
export interface OperationMeta<OperationValue = any, Source = any, ApplyResult = any> {
  /**
   * 操作类型 需要唯一
   */
  type: string;
  /**
   * 将一个操作转换成另一个逆操作， 如insert转成delete
   * @param op 操作
   * @returns 逆操作
   */
  inverse: (op: Operation<OperationValue>) => Operation<OperationValue>;
  /**
   * 判断是否可以合并
   * @param op 操作
   * @param prev 上一个操作
   * @returns true表示可以合并 返回一个操作表示直接用新操作替换之前的操作
   */
  shouldMerge?: (
    op: Operation<OperationValue>,
    prev: Operation<OperationValue> | undefined,
    stackItem: StackOperation
  ) => boolean | Operation;
  /**
   * 判断是否需要保存，如选中等操作可以不保存
   * @param op 操作
   * @returns true表示可以保存
   */
  shouldSave?: (op: Operation<OperationValue>) => boolean;
  /**
   * 执行操作
   * @param operation 操作
   */
  apply(operation: Operation<OperationValue>, source: Source): ApplyResult | Promise<ApplyResult>;
  /**
   * 获取标签
   */
  getLabel?: (operation: Operation<OperationValue>, source: Source) => string;
  /**
   * 获取描述
   */
  getDescription?: (operation: Operation<OperationValue>, source: Source) => string;
  /**
   * 获取uri
   */
  getURI?: (operation: Operation<OperationValue>, source: Source) => string | undefined;
}
