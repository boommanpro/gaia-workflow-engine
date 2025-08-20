/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import 'server-only';
import { WorkflowJSON } from '@flowgram.ai/free-layout-editor';

import { WorkflowRuntimeModel } from '@runtime/models';

export const main = async (json: WorkflowJSON) => {
  WorkflowRuntimeModel.instance.run();
  return {
    timestamp: new Date().toISOString(),
    message: 'Server processing completed',
    input: json,
  };
};
