/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject } from 'inversify';
import { IPoint, Emitter } from '@flowgram.ai/utils';
import { FlowNodeEntityOrId, FlowOperationBaseServiceImpl } from '@flowgram.ai/document';
import { TransformData } from '@flowgram.ai/core';

import { WorkflowLinesManager } from '../workflow-lines-manager';
import { WorkflowDocument } from '../workflow-document';
import {
  NodePostionUpdateEvent,
  WorkflowOperationBaseService,
} from '../typings/workflow-operation';
import { WorkflowJSON } from '../typings';
import { WorkflowNodeEntity, WorkflowLineEntity } from '../entities';

export class WorkflowOperationBaseServiceImpl
  extends FlowOperationBaseServiceImpl
  implements WorkflowOperationBaseService
{
  @inject(WorkflowDocument)
  protected declare document: WorkflowDocument;

  @inject(WorkflowLinesManager) linesManager: WorkflowLinesManager;

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

  fromJSON(json: WorkflowJSON) {
    if (this.document.disposed) return;
    const workflowJSON: WorkflowJSON = {
      nodes: json.nodes ?? [],
      edges: json.edges ?? [],
    };

    const oldNodes = this.document.getAllNodes();
    const oldEdges = this.linesManager.getAllLines();
    const oldPositionMap = new Map<string, IPoint>(
      oldNodes.map((node) => [
        node.id,
        {
          x: node.transform.transform.position.x,
          y: node.transform.transform.position.y,
        },
      ])
    );

    const newNodes: WorkflowNodeEntity[] = [];
    const newEdges: WorkflowLineEntity[] = [];

    // 逐层渲染
    this.document.batchAddFromJSON(workflowJSON, {
      onNodeCreated: (node) => newNodes.push(node),
      onEdgeCreated: (edge) => newEdges.push(edge),
    });

    const newEdgeIDSet = new Set<string>(newEdges.map((edge) => edge.id));
    oldEdges.forEach((edge) => {
      // 清空旧线条
      if (!newEdgeIDSet.has(edge.id)) {
        edge.dispose();
        return;
      }
    });

    const newNodeIDSet = new Set<string>(newNodes.map((node) => node.id));
    oldNodes.forEach((node) => {
      // 清空旧节点
      if (!newNodeIDSet.has(node.id)) {
        node.dispose();
        return;
      }
      // 记录现有节点位置变更
      const oldPosition = oldPositionMap.get(node.id);
      const newPosition = {
        x: node.transform.transform.position.x,
        y: node.transform.transform.position.y,
      };
      if (oldPosition && (oldPosition.x !== newPosition.x || oldPosition.y !== newPosition.y)) {
        this.onNodePostionUpdateEmitter.fire({
          node,
          oldPosition,
          newPosition,
        });
      }
    });

    // 批量触发画布更新
    this.document.fireRender();
  }
}
