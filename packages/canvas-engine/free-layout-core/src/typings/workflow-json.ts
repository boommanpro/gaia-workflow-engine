/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type WorkflowLineEntity, type WorkflowNodeEntity } from '../entities';
import { type WorkflowNodeJSON } from './workflow-node';
import { type WorkflowEdgeJSON } from './workflow-edge';

export interface WorkflowJSON {
  nodes: WorkflowNodeJSON[];
  edges: WorkflowEdgeJSON[];
}

export enum WorkflowContentChangeType {
  /**
   * 添加节点
   */
  ADD_NODE = 'ADD_NODE',
  /**
   * 删除节点
   */
  DELETE_NODE = 'DELETE_NODE',
  /**
   * 移动节点
   */
  MOVE_NODE = 'MOVE_NODE',
  /**
   * 节点数据更新 （表单引擎数据 或者 extInfo 数据）
   */
  NODE_DATA_CHANGE = 'NODE_DATA_CHANGE',
  /**
   * 添加线条
   */
  ADD_LINE = 'ADD_LINE',
  /**
   * 删除线条
   */
  DELETE_LINE = 'DELETE_LINE',
  /**
   * 线条数据修改
   */
  LINE_DATA_CHANGE = 'LINE_DATA_CHANGE',
  /**
   * 节点Meta信息变更
   */
  META_CHANGE = 'META_CHANGE',
}

export interface WorkflowContentChangeEvent {
  type: WorkflowContentChangeType;
  /**
   * 当前触发的元素的json数据，toJSON 需要主动触发
   */
  toJSON: () => any;
  /**
   * oldValue
   */
  oldValue?: any;
  /*
   * 当前的事件的 entity
   */
  entity: WorkflowNodeEntity | WorkflowLineEntity;
}
