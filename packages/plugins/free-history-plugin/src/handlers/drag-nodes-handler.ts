/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { injectable, inject } from 'inversify';
import { HistoryService } from '@flowgram.ai/history';
import { type NodesDragEndEvent } from '@flowgram.ai/free-layout-core';
import { TransformData } from '@flowgram.ai/core';

import { FreeOperationType, type IHandler } from '../types';

@injectable()
export class DragNodesHandler implements IHandler<NodesDragEndEvent> {
  @inject(HistoryService)
  private _historyService: HistoryService;

  handle(event: NodesDragEndEvent) {
    if (event.type === 'onDragEnd') {
      this._dragNode(event);
    }
  }

  private _dragNode(event: NodesDragEndEvent) {
    this._historyService.pushOperation(
      {
        type: FreeOperationType.dragNodes,
        value: {
          ids: event.nodes.map((node) => node.id),
          value: event.nodes.map((node) => {
            const { x, y } = node.getData(TransformData).position;
            return {
              x,
              y,
            };
          }),
          oldValue: event.startPositions,
        },
      },
      { noApply: true }
    );
  }
}
