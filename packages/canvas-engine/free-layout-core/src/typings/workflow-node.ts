/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { IPoint } from '@flowgram.ai/utils';
import type { FlowNodeJSON, FlowNodeMeta } from '@flowgram.ai/document';

import type { WorkflowNodeEntity, WorkflowPorts } from '../entities';
import type { WorkflowSubCanvas } from './workflow-sub-canvas';
import type { WorkflowEdgeJSON } from './workflow-edge';

/**
 * 节点 meta 信息
 */
export interface WorkflowNodeMeta extends FlowNodeMeta {
  position?: IPoint;
  canvasPosition?: IPoint; // 子画布位置
  deleteDisable?: boolean; // 是否禁用删除
  copyDisable?: boolean; // 禁用复制
  inputDisable?: boolean; // 禁用输入点
  outputDisable?: boolean; // 禁用输出点
  defaultPorts?: WorkflowPorts; // 默认点位
  useDynamicPort?: boolean; // 使用动态点位，会计算 data-port-key
  subCanvas?: (node: WorkflowNodeEntity) => WorkflowSubCanvas | undefined;
  isContainer?: boolean; // 是否容器节点
}

/**
 * 节点数据
 */
export interface WorkflowNodeJSON extends FlowNodeJSON {
  id: string;
  type: string | number;
  /**
   * ui 数据
   */
  meta?: WorkflowNodeMeta;
  /**
   * 表单数据
   */

  data?: any;
  /**
   * 子节点
   */
  blocks?: WorkflowNodeJSON[];
  /**
   * 子节点间连线
   */
  edges?: WorkflowEdgeJSON[];
}
