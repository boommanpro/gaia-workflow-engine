/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowRendererKey } from '@flowgram.ai/renderer';

export const RENDER_SLOT_ADDER_KEY: string = FlowRendererKey.SLOT_ADDER;
export const RENDER_SLOT_LABEL_KEY: string = FlowRendererKey.SLOT_LABEL;
export const RENDER_SLOT_COLLAPSE_KEY: string = FlowRendererKey.SLOT_COLLAPSE;

export const SlotSpacingKey = {
  /**
   * = Next Node - Slot END
   */
  SLOT_SPACING: 'SLOT_SPACING',

  /**
   * = Slot Start Line - Slot Icon Right
   */
  SLOT_START_DISTANCE: 'SLOT_START_DISTANCE',

  /**
   * = Slot Radius
   */
  SLOT_RADIUS: 'SLOT_RADIUS',

  /**
   * = Slot Port - Slot Start
   */
  SLOT_PORT_DISTANCE: 'SLOT_PORT_DISTANCE',

  /**
   * = Slot Label - Slot Start
   */
  SLOT_LABEL_DISTANCE: 'SLOT_LABEL_DISTANCE',

  /**
   * = Slot Block - Slot Port
   */
  SLOT_BLOCK_PORT_DISTANCE: 'SLOT_BLOCK_PORT_DISTANCE',

  /**
   * Vertical Layout: Slot Block - Slot Block
   */
  SLOT_BLOCK_VERTICAL_SPACING: 'SLOT_BLOCK_VERTICAL_SPACING',
};

export const SLOT_START_DISTANCE = 16;
export const SLOT_PORT_DISTANCE = 100;
export const SLOT_LABEL_DISTANCE = 32;
export const SLOT_BLOCK_PORT_DISTANCE = 32.5;
export const SLOT_RADIUS = 16;
export const SLOT_SPACING = 32;
export const SLOT_BLOCK_VERTICAL_SPACING = 32.5;
export const SLOT_NODE_LAST_SPACING = 10;
