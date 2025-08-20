/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Event } from '@flowgram.ai/utils';
import {
  FlowNodeEntity,
  FlowNodeEntityOrId,
  FlowOperationBaseService,
} from '@flowgram.ai/document';

export interface NodePostionUpdateEvent {
  node: FlowNodeEntity;
  oldPosition: IPoint;
  newPosition: IPoint;
}

export interface WorkflowOperationBaseService extends FlowOperationBaseService {
  /**
   * 节点位置更新事件
   */
  readonly onNodePostionUpdate: Event<NodePostionUpdateEvent>;
  /**
   * 更新节点位置
   * @param nodeOrId
   * @param position
   * @returns
   */
  updateNodePosition(nodeOrId: FlowNodeEntityOrId, position: IPoint): void;
}

export const WorkflowOperationBaseService = Symbol('WorkflowOperationBaseService');
