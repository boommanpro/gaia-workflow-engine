/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject } from 'inversify';
import { IPoint, Emitter } from '@flowgram.ai/utils';
import { FlowNodeEntityOrId, FlowOperationBaseServiceImpl } from '@flowgram.ai/document';
import { TransformData } from '@flowgram.ai/core';

import { WorkflowDocument } from '../workflow-document';
import {
  NodePostionUpdateEvent,
  WorkflowOperationBaseService,
} from '../typings/workflow-operation';

export class WorkflowOperationBaseServiceImpl
  extends FlowOperationBaseServiceImpl
  implements WorkflowOperationBaseService
{
  @inject(WorkflowDocument)
  protected declare document: WorkflowDocument;

  private onNodePostionUpdateEmitter = new Emitter<NodePostionUpdateEvent>();

  public readonly onNodePostionUpdate = this.onNodePostionUpdateEmitter.event;

  updateNodePosition(nodeOrId: FlowNodeEntityOrId, position: IPoint): void {
    const node = this.toNodeEntity(nodeOrId);

    if (!node) {
      return;
    }

    const transformData = node.getData(TransformData);
    const oldPosition = {
      x: transformData.position.x,
      y: transformData.position.y,
    };
    transformData.update({
      position,
    });

    this.onNodePostionUpdateEmitter.fire({
      node,
      oldPosition,
      newPosition: position,
    });
  }
}
