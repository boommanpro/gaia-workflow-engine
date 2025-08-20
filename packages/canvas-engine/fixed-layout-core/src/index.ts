/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export * from './fixed-layout-container-module';
import {
  BlockIconRegistry,
  BlockOrderIconRegistry,
  BlockRegistry,
  DynamicSplitRegistry,
  EmptyRegistry,
  LoopRegistry,
  StaticSplitRegistry,
  TryCatchRegistry,
  StartRegistry,
  RootRegistry,
  InlineBlocksRegistry,
  EndRegistry,
  SlotRegistry,
} from './activities';

export const FixedLayoutRegistries = {
  BlockIconRegistry,
  BlockOrderIconRegistry,
  BlockRegistry,
  DynamicSplitRegistry,
  EmptyRegistry,
  LoopRegistry,
  StaticSplitRegistry,
  TryCatchRegistry,
  StartRegistry,
  RootRegistry,
  InlineBlocksRegistry,
  EndRegistry,
  SlotRegistry,
};

// Export constant
export { SlotSpacingKey } from './activities/slot/constants';
