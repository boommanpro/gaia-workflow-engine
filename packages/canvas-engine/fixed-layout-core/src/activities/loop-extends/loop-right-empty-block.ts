/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FlowNodeRegistry } from '@flowgram.ai/document';

import { BlockRegistry } from '../block';
import { LoopTypeEnum } from './constants';

export const LoopRightEmptyBlockRegistry: FlowNodeRegistry = {
  ...BlockRegistry,
  type: LoopTypeEnum.LOOP_RIGHT_EMPTY_BLOCK,
  meta: {
    ...BlockRegistry.meta,
    inlineSpacingAfter: 0,
  },
};
