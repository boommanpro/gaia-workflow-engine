/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeRegistry, FlowNodeBaseType } from '@flowgram.ai/document';

import { drawCollapseLabel, drawCollapseLine } from '../utils/transition';
import { canSlotDrilldown, insideSlot } from '../utils/node';

export const SlotIconRegistry: FlowNodeRegistry = {
  type: FlowNodeBaseType.BLOCK_ICON,
  meta: {
    defaultExpanded: false,
    spacing: 0,
  },
  getLines: (transition) => [
    ...(canSlotDrilldown(transition.entity.parent!) ? drawCollapseLine(transition) : []),
  ],
  getLabels: (transition) => [
    ...(canSlotDrilldown(transition.entity.parent!) ? drawCollapseLabel(transition) : []),
  ],
  getDelta: (transform) => {
    // Slot 节点内部时，重新纠正重心调整产生的偏移
    if (insideSlot(transform.entity.parent)) {
      return transform.entity.isVertical
        ? { x: -transform.originDeltaX, y: 0 }
        : { x: 0, y: -transform.originDeltaY };
    }
    return { x: 0, y: 0 };
  },
};
