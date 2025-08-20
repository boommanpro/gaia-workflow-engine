/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity } from '@flowgram.ai/document';

import { FlowNodeErrorData } from './flow-node-error-data';

export function getNodeError(node: FlowNodeEntity) {
  return node.getData<FlowNodeErrorData>(FlowNodeErrorData).getError();
}
