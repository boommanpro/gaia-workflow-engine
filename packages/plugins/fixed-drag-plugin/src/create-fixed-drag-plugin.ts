/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type Xor } from '@flowgram.ai/utils';
import { FlowDragLayer } from '@flowgram.ai/renderer';
import { FlowNodeEntity, FlowNodeJSON } from '@flowgram.ai/document';
import { definePluginCreator, PluginContext } from '@flowgram.ai/core';

// import { SelectorBounds } from './selector-bounds';

export interface FixDragPluginOptions<CTX extends PluginContext = PluginContext> {
  enable?: boolean;
  /**
   * Callback when drag drop
   */
  onDrop?: (ctx: CTX, dropData: { dragNodes: FlowNodeEntity[]; dropNode: FlowNodeEntity }) => void;
  /**
   * Check can drop
   * @param ctx
   * @param dropData
   */
  canDrop?: (
    ctx: CTX,
    dropData: {
      dropNode: FlowNodeEntity;
      isBranch?: boolean;
    } & Xor<
      {
        dragNodes: FlowNodeEntity[];
      },
      {
        dragJSON: FlowNodeJSON;
      }
    >
  ) => boolean;
}

export const createFixedDragPlugin = definePluginCreator<FixDragPluginOptions<any>>({
  onInit(ctx, opts): void {
    // 默认可用，所以强制判断 false
    if (opts.enable !== false) {
      ctx.playground.registerLayer(FlowDragLayer, {
        onDrop: opts.onDrop ? opts.onDrop.bind(null, ctx) : undefined,
        canDrop: opts.canDrop ? opts.canDrop.bind(null, ctx) : undefined,
      });
    }
  },
});
