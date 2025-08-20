/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable, postConstruct } from 'inversify';
import { HistoryService } from '@flowgram.ai/history';
import { FixedHistoryService } from '@flowgram.ai/fixed-history-plugin';
import {
  AddBlockConfig,
  AddOrDeleteNodeValue,
  FlowDocument,
  FlowNodeEntity,
  FlowNodeEntityOrId,
  FlowNodeJSON,
  FlowOperation,
  MoveChildNodesOperationValue,
  OnNodeAddEvent,
  OperationType,
} from '@flowgram.ai/editor';

import { FlowOperationService } from '../types';
import { FlowOperationServiceImpl } from './flow-operation-service';

@injectable()
export class HistoryOperationServiceImpl
  extends FlowOperationServiceImpl
  implements FlowOperationService
{
  @inject(FixedHistoryService)
  protected fixedHistoryService: FixedHistoryService;

  @inject(HistoryService)
  protected historyService: HistoryService;

  @inject(FlowDocument)
  protected document: FlowDocument;

  @postConstruct()
  protected init() {
    this.toDispose.push(this.onNodeAdd(this.handleNodeAdd.bind(this)));
  }

  addFromNode(fromNode: FlowNodeEntityOrId, nodeJSON: FlowNodeJSON): FlowNodeEntity {
    return this.fixedHistoryService.addFromNode(fromNode, nodeJSON);
  }

  addBlock(
    target: FlowNodeEntityOrId,
    blockJSON: FlowNodeJSON,
    config: AddBlockConfig = {}
  ): FlowNodeEntity {
    const { parent, index } = config;
    return this.fixedHistoryService.addBlock(target, blockJSON, parent, index);
  }

  deleteNode(nodeOrId: FlowNodeEntityOrId): void {
    const node = this.toNodeEntity(nodeOrId);
    if (!node) {
      return;
    }
    this.fixedHistoryService.deleteNode(node);
  }

  deleteNodes(nodes: FlowNodeEntityOrId[]): void {
    const nodesEntities = nodes.map((node) =>
      typeof node === 'string' ? this.document.getNode(node) : node
    ) as FlowNodeEntity[];
    return this.fixedHistoryService.deleteNodes(nodesEntities);
  }

  startTransaction(): void {
    this.historyService.startTransaction();
  }

  endTransaction(): void {
    this.historyService.endTransaction();
  }

  apply(operation: FlowOperation) {
    this.historyService.pushOperation(operation);
  }

  protected doMoveNode(node: FlowNodeEntity, newParent: FlowNodeEntity, index: number) {
    const fromParentId = node.parent?.id;

    if (!fromParentId) {
      return;
    }

    const value: MoveChildNodesOperationValue = {
      nodeIds: [this.toId(node)],
      fromParentId: node.parent.id,
      toParentId: this.toId(newParent),
      fromIndex: this.getNodeIndex(node),
      toIndex: index,
    };

    return this.historyService.pushOperation({
      type: OperationType.moveChildNodes,
      value,
    });
  }

  protected handleNodeAdd({ data: addNodeData }: OnNodeAddEvent): FlowNodeEntity {
    const { parent, index, hidden, originParent, ...nodeJSON } = addNodeData;
    const value: AddOrDeleteNodeValue = {
      data: nodeJSON,
      parentId: parent?.id,
      index,
      hidden,
    };

    return this.historyService.pushOperation(
      {
        type: OperationType.addNode,
        value: value,
        uri: this.fixedHistoryService.config.getNodeURI(nodeJSON.id),
      },
      {
        noApply: true,
      }
    );
  }
}
