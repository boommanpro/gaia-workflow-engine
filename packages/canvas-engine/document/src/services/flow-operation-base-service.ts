/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable, postConstruct } from 'inversify';
import { DisposableCollection, Emitter } from '@flowgram.ai/utils';
import { EntityManager } from '@flowgram.ai/core';

import {
  FlowOperation,
  FlowOperationBaseService,
  MoveChildNodesOperationValue,
  OperationType,
} from '../typings/flow-operation';
import {
  AddBlockConfig,
  AddNodeConfig,
  AddNodeData,
  FlowNodeBaseType,
  FlowNodeEntityOrId,
  FlowNodeJSON,
  MoveNodeConfig,
  OnNodeAddEvent,
  OnNodeMoveEvent,
} from '../typings';
import { FlowDocument } from '../flow-document';
import { FlowNodeEntity } from '../entities';

/**
 * 操作服务
 */
@injectable()
export class FlowOperationBaseServiceImpl implements FlowOperationBaseService {
  @inject(EntityManager)
  protected entityManager: EntityManager;

  @inject(FlowDocument)
  protected document: FlowDocument;

  protected onNodeAddEmitter = new Emitter<OnNodeAddEvent>();

  readonly onNodeAdd = this.onNodeAddEmitter.event;

  protected toDispose = new DisposableCollection();

  private onNodeMoveEmitter = new Emitter<OnNodeMoveEvent>();

  readonly onNodeMove = this.onNodeMoveEmitter.event;

  @postConstruct()
  protected init() {
    this.toDispose.pushAll([this.onNodeAddEmitter, this.onNodeMoveEmitter]);
  }

  addNode(nodeJSON: FlowNodeJSON, config: AddNodeConfig = {}): FlowNodeEntity {
    const { parent, index, hidden } = config;
    let parentEntity;

    if (parent) {
      parentEntity = this.toNodeEntity(parent);
    }

    let register;
    if (parentEntity) {
      register = parentEntity.getNodeRegistry();
    }

    const addJSON = {
      ...nodeJSON,
      type: nodeJSON.type || FlowNodeBaseType.BLOCK,
    };

    const addNodeData: AddNodeData = {
      ...addJSON,
      parent: parentEntity,
      index,
      hidden,
    };

    let added;
    if (parentEntity && register?.addChild) {
      added = register.addChild(parentEntity, addJSON, {
        index,
        hidden,
      });
    } else {
      added = this.document.addNode(addNodeData);
    }

    this.onNodeAddEmitter.fire({
      node: added,
      data: addNodeData,
    });

    return added;
  }

  addFromNode(fromNode: FlowNodeEntityOrId, nodeJSON: FlowNodeJSON): FlowNodeEntity {
    return this.document.addFromNode(fromNode, nodeJSON);
  }

  deleteNode(node: FlowNodeEntityOrId): void {
    this.document.removeNode(node);
  }

  deleteNodes(nodes: FlowNodeEntityOrId[]): void {
    (nodes || []).forEach((node) => {
      this.deleteNode(node);
    });
  }

  addBlock(
    target: FlowNodeEntityOrId,
    blockJSON: FlowNodeJSON,
    config: AddBlockConfig = {}
  ): FlowNodeEntity {
    const { parent, index } = config;
    return this.document.addBlock(target, blockJSON, undefined, parent, index);
  }

  moveNode(node: FlowNodeEntityOrId, config: MoveNodeConfig = {}) {
    const { parent: newParent, index } = config;
    const entity = this.toNodeEntity(node);
    const parent = entity?.parent;

    if (!parent) {
      return;
    }

    const newParentEntity: FlowNodeEntity | undefined = newParent
      ? this.toNodeEntity(newParent)
      : parent;

    if (!newParentEntity) {
      console.warn('no new parent found', newParent);
      return;
    }

    let toIndex = typeof index === 'undefined' ? newParentEntity.collapsedChildren.length : index;

    return this.doMoveNode(entity, newParentEntity, toIndex);
  }

  /**
   * 拖拽节点
   * @param param0
   * @returns
   */
  dragNodes({ dropNode, nodes }: { dropNode: FlowNodeEntity; nodes: FlowNodeEntity[] }) {
    if (nodes.length === 0) {
      return;
    }

    const startNode = nodes[0];
    const fromParent = startNode.parent;
    const toParent = dropNode.parent;

    if (!fromParent || !toParent) {
      return;
    }

    const fromIndex = fromParent.children.findIndex((child) => child === startNode);
    const dropIndex = toParent.children.findIndex((child) => child === dropNode);

    let toIndex = dropIndex + 1;
    // 同父级节点移动，处理脏路径
    if (fromParent === toParent && fromIndex < dropIndex) {
      toIndex = toIndex - nodes.length;
    }

    const value: MoveChildNodesOperationValue = {
      nodeIds: nodes.map((node) => node.id),
      fromParentId: fromParent.id,
      toParentId: toParent.id,
      fromIndex,
      toIndex,
    };

    return this.apply({
      type: OperationType.moveChildNodes,
      value,
    });
  }

  /**
   * 执行操作
   * @param operation 可序列化的操作
   * @returns 操作返回
   */
  apply(operation: FlowOperation): any {
    const document = this.document;
    switch (operation.type) {
      case OperationType.addFromNode:
        return document.addFromNode(operation.value.fromId, operation.value.data);
      case OperationType.deleteFromNode:
        return document.getNode(operation.value?.data?.id)?.dispose();
      case OperationType.addBlock: {
        let parent;

        if (operation.value.parentId) {
          parent = document.getNode(operation.value.parentId);
        }
        return document.addBlock(
          operation.value.targetId,
          operation.value.blockData,
          undefined,
          parent,
          operation.value.index
        );
      }
      case OperationType.deleteBlock: {
        const entity = document.getNode(operation.value?.blockData.id);
        return entity?.dispose();
      }
      case OperationType.createGroup: {
        const groupNode = document.addFromNode(operation.value.targetId, {
          id: operation.value.groupId,
          type: FlowNodeBaseType.GROUP,
        });
        document.moveNodes({
          dropNodeId: operation.value.groupId,
          sortNodeIds: operation.value.nodeIds,
          inside: true,
        });
        return groupNode;
      }
      case OperationType.ungroup: {
        document.moveNodes({
          dropNodeId: operation.value.groupId,
          sortNodeIds: operation.value.nodeIds,
        });
        return document.getNode(operation.value.groupId)?.dispose();
      }
      case OperationType.moveNodes: {
        return document.moveNodes({
          dropNodeId: operation.value.toId,
          sortNodeIds: operation.value.nodeIds,
        });
      }
      case OperationType.moveBlock: {
        return document.moveChildNodes({
          ...operation.value,
          nodeIds: [operation.value.nodeId],
        });
      }
      case OperationType.addNodes: {
        let fromId = operation.value.fromId;
        (operation.value.nodes || []).forEach((node) => {
          const added = document.addFromNode(fromId, node);
          fromId = added.id;
        });
        break;
      }
      case OperationType.deleteNodes: {
        (operation.value.nodes || []).forEach((node) => {
          const entity = document.getNode(node.id);
          entity?.dispose();
        });
        break;
      }
      case OperationType.addChildNode: {
        return document.addNode({
          ...operation.value.data,
          parent: operation.value.parentId ? document.getNode(operation.value.parentId) : undefined,
          originParent: operation.value.originParentId
            ? document.getNode(operation.value.originParentId)
            : undefined,
          index: operation.value.index,
          hidden: operation.value.hidden,
        });
      }
      case OperationType.deleteChildNode:
        return document.getNode(operation.value.data.id)?.dispose();
      case OperationType.moveChildNodes:
        return document.moveChildNodes(operation.value);
      default:
        throw new Error(`unknown operation type`);
    }
  }

  /**
   * 事务执行
   * @param transaction
   */
  transact(transaction: () => void) {
    transaction();
  }

  dispose() {
    this.toDispose.dispose();
  }

  protected toId(node: FlowNodeEntityOrId): string {
    return typeof node === 'string' ? node : node.id;
  }

  protected toNodeEntity(node: FlowNodeEntityOrId): FlowNodeEntity | undefined {
    return typeof node === 'string' ? this.document.getNode(node) : node;
  }

  protected getNodeIndex(node: FlowNodeEntityOrId): number {
    const entity = this.toNodeEntity(node);
    const parent = entity?.parent;

    if (!parent) {
      return -1;
    }

    return parent.children.findIndex((child) => child === entity);
  }

  protected doMoveNode(node: FlowNodeEntity, newParent: FlowNodeEntity, index: number) {
    if (!node.parent) {
      throw new Error('root node cannot move');
    }

    const event: OnNodeMoveEvent = {
      node,
      fromParent: node.parent,
      toParent: newParent,
      fromIndex: this.getNodeIndex(node),
      toIndex: index,
    };

    this.document.moveChildNodes({
      nodeIds: [this.toId(node)],
      toParentId: this.toId(newParent),
      toIndex: index,
    });
    this.onNodeMoveEmitter.fire(event);
  }
}
