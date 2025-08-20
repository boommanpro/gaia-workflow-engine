/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity } from '@flowgram.ai/document';

import { FlowNodeVariableData } from './flow-node-variable-data';

export function getNodeScope(node: FlowNodeEntity) {
  return node.getData(FlowNodeVariableData).public;
}

export function getNodePrivateScope(node: FlowNodeEntity) {
  return node.getData(FlowNodeVariableData).initPrivate();
}
