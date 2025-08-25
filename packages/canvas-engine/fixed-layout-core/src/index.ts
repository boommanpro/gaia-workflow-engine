/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export * from './fixed-layout-container-module';
import { SlotIconRegistry, SlotInlineBlocksRegistry } from './activities/slot/extends';
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
  SlotBlockRegistry,
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
  SlotBlockRegistry,
  SlotIconRegistry,
  SlotInlineBlocksRegistry,
};

// Export constant
export { SlotSpacingKey } from './activities/slot/constants';
