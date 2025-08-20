/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Scope } from '@flowgram.ai/variable-core';
import { FlowNodeEntity } from '@flowgram.ai/document';

export enum FlowNodeScopeTypeEnum {
  public = 'public',
  private = 'private',
}

export interface FlowNodeScopeMeta {
  node?: FlowNodeEntity;
  type?: FlowNodeScopeTypeEnum;
}

export interface ScopeVirtualNode {
  id: string;
  flowNodeType: 'virtualNode';
}

export type ScopeChainNode = FlowNodeEntity | ScopeVirtualNode;

// 节点内部的作用域
export interface FlowNodeScope extends Scope<FlowNodeScopeMeta> {}
