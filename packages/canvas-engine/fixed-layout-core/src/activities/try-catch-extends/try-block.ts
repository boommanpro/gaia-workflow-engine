/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { DEFAULT_SPACING, FlowNodeBaseType, type FlowNodeRegistry } from '@flowgram.ai/document';

import { TryCatchTypeEnum } from './constants';

/**
 * try 分支
 */
export const TryBlockRegistry: FlowNodeRegistry = {
  extend: FlowNodeBaseType.BLOCK,
  type: TryCatchTypeEnum.TRY_BLOCK,
  meta: {
    hidden: true,
    spacing: DEFAULT_SPACING.NULL,
  },
  getLines() {
    return [];
  },
  getLabels() {
    return [];
  },
};
