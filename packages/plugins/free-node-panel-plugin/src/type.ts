/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type React from 'react';

import type { PositionSchema } from '@flowgram.ai/utils';
import type { WorkflowNodeEntity, WorkflowPortEntity } from '@flowgram.ai/free-layout-core';
import type { WorkflowNodeJSON } from '@flowgram.ai/free-layout-core';

export interface NodePanelCallParams {
  /** 唤起节点面板的位置 */
  panelPosition: PositionSchema;
  /** 自定义传给面板组件的props */
  panelProps?: Record<string, any>;
  /** 指定父节点 */
  containerNode?: WorkflowNodeEntity;
  /** 创建节点后需连接的前序端口 */
  fromPort?: WorkflowPortEntity;
  /** 创建节点后需连接的后序端口 */
  toPort?: WorkflowPortEntity;
  /** 偏移后续节点默认间距 */
  autoOffsetPadding?: PositionSchema;
  /** 自定义节点位置 */
  customPosition?: (params: { nodeType: string; selectPosition: PositionSchema }) => PositionSchema;
  /** 是否可以添加节点 */
  canAddNode?: (params: { nodeType: string; containerNode?: WorkflowNodeEntity }) => boolean;
  /** 创建节点后 */
  afterAddNode?: (node?: WorkflowNodeEntity) => void;
  /** 是否创建线条 */
  enableBuildLine?: boolean;
  /** 是否使用选中位置作为节点位置 */
  enableSelectPosition?: boolean;
  /** 是否偏移后续节点 */
  enableAutoOffset?: boolean;
  /** 是否触发节点拖拽 */
  enableDragNode?: boolean;
  /** 是否可以添加多个节点 */
  enableMultiAdd?: boolean;
}

export type NodePanelResult =
  | {
      nodeType: string;
      nodeJSON?: WorkflowNodeJSON;
      selectEvent: React.MouseEvent;
    }
  | undefined;

export interface CallNodePanelParams {
  onSelect: (params?: NodePanelResult) => void;
  position: PositionSchema;
  onClose: () => void;
  panelProps?: Record<string, any>;
  enableMultiAdd?: boolean;
  containerNode?: WorkflowNodeEntity;
}

export type CallNodePanel = (params: CallNodePanelParams) => Promise<void>;

export interface NodePanelRenderProps extends CallNodePanelParams {}

export type NodePanelRender = React.FC<NodePanelRenderProps>;

export interface NodePanelLayerOptions {
  renderer: NodePanelRender;
}

export interface NodePanelPluginOptions extends NodePanelLayerOptions {}
