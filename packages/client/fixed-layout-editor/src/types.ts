/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  FlowNodeEntity,
  FlowNodeEntityOrId,
  FlowOperationBaseService,
} from '@flowgram.ai/editor';

export interface FlowOperationService extends FlowOperationBaseService {
  /**
   * 创建分组
   * @param nodes 节点列表
   */
  createGroup(nodes: FlowNodeEntity[]): FlowNodeEntity | undefined;
  /**
   * 取消分组
   * @param groupNode
   */
  ungroup(groupNode: FlowNodeEntity): void;
  /**
   * 开始事务
   */
  startTransaction(): void;
  /**
   * 结束事务
   */
  endTransaction(): void;
  /**
   * 修改表单数据
   * @param node 节点
   * @param path 属性路径
   * @param value 值
   */
  setFormValue(node: FlowNodeEntityOrId, path: string, value: unknown): void;
}

export const FlowOperationService = Symbol('FlowOperationService');
