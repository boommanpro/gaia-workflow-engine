/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export * from './create-variable-plugin';
export * from '@flowgram.ai/variable-core';
export {
  FlowNodeVariableData,
  GlobalScope,
  ScopeChainTransformService,
  getNodeScope,
  getNodePrivateScope,
  FlowNodeScopeType,
  type FlowNodeScopeMeta,
  type FlowNodeScope,
} from '@flowgram.ai/variable-layout';
