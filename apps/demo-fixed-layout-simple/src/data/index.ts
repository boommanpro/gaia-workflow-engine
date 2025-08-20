/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocumentJSON, FlowLayoutDefault } from '@flowgram.ai/fixed-layout-editor';

import { tryCatch } from './tryCatch';
import { slot } from './slot';
import { multiOutputs } from './multiOutputs';
import { multiInputs } from './multiInputs';
import { mindmap } from './mindmap';
import { loop } from './loop';
import { dynamicSplit } from './dynamicSplit';
import { condition } from './condition';

export const FLOW_LIST: Record<string, FlowDocumentJSON & { defaultLayout?: FlowLayoutDefault }> = {
  condition,
  mindmap: { ...mindmap, defaultLayout: FlowLayoutDefault.HORIZONTAL_FIXED_LAYOUT },
  tryCatch,
  dynamicSplit,
  loop,
  multiInputs,
  multiOutputs,
  slot,
};
