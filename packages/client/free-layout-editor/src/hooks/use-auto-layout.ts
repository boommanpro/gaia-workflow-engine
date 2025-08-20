/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService } from '@flowgram.ai/free-layout-core';

import { WorkflowAutoLayoutTool } from '../tools';

export const useAutoLayout = () => {
  const autoLayoutTool = useService(WorkflowAutoLayoutTool);
  return autoLayoutTool.handle.bind(autoLayoutTool);
};
