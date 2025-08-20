/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EntityDataRegistry } from '@flowgram.ai/core';

import { FlowNodeFormData } from '../form';
import { FlowNodeErrorData } from '../error';

export function createNodeEntityDatas(): EntityDataRegistry[] {
  return [FlowNodeFormData, FlowNodeErrorData];
}
