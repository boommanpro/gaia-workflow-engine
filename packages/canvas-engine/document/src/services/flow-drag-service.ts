/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { Emitter } from '@flowgram.ai/utils';
import { EntityManager } from '@flowgram.ai/core';

import { FlowGroupUtils } from './flow-group-service/flow-group-utils';
import { FlowNodeBaseType, FlowOperationBaseService, LABEL_SIDE_TYPE } from '../typings';
import { FlowDocument } from '../flow-document';
import { FlowNodeEntity, FlowRendererStateEntity } from '../entities';
import { FlowNodeRenderData } from '../datas';

/**
 * 拖拽相关操作
 * 外部实现抽象类
 */
@injectable()
export class FlowDragService {
  @inject(FlowDocument)
  protected document: FlowDocument;

  @inject(FlowOperationBaseService)
  protected operationService: FlowOperationBaseService;

  @inject(EntityManager)
  protected entityManager: EntityManager;

  protected onDropEmitter = new Emitter<{
    dropNode: FlowNodeEntity;
    dragNodes: FlowNodeEntity[];
  }>();

  readonly onDrop = this.onDropEmitter.event;

  get renderState(): FlowRendererStateEntity {
    return this.document.renderState;
  }

  // 拖拽所有节点中的首个节点
  get dragStartNode(): FlowNodeEntity {
    return this.renderState.getDragStartEntity()!;
  }

  // 拖拽的所有节点
  get dragNodes(): FlowNodeEntity[] {
    return this.renderState.getDragEntities();
  }

  // 放置的区域
  get dropNodeId(): string | undefined {
    return this.renderState.getNodeDroppingId();
  }

  // 是否在拖拽分支
  get isDragBranch(): boolean {
    return this.dragStartNode?.isInlineBlock;
  }

  // 拖拽的所有节点及其自节点
  get nodeDragIdsWithChildren(): string[] {
    return this.renderState.config.nodeDragIdsWithChildren || [];
  }

  get dragging(): boolean {
    const renderData = this.dragStartNode?.getData<FlowNodeRenderData>(FlowNodeRenderData)!;
    return !!renderData?.dragging;
  }

  get labelSide(): LABEL_SIDE_TYPE | undefined {
    return this.renderState.config.dragLabelSide;
  }

  /**
   * 放置到目标分支
   */
  dropBranch(): void {
    this.dropNode();
  }

  /**
   * 移动到目标节点
   */
  dropNode(): void {
    const dropEntity = this.document.getNode(this.dropNodeId!);
    if (!dropEntity) {
      return;
    }

    const sortNodes: FlowNodeEntity[] = [];
    let curr: FlowNodeEntity | undefined = this.dragStartNode;
    while (curr && this.dragNodes.includes(curr)) {
      sortNodes.push(curr);
      curr = curr.next;
    }

    this.operationService.dragNodes({
      dropNode: dropEntity,
      nodes: sortNodes,
    });

    if (sortNodes.length > 0) {
      this.onDropEmitter.fire({
        dropNode: dropEntity,
        dragNodes: sortNodes,
      });
    }
  }

  /**
   * 拖拽是否可以释放在该节点后面
   */
  isDroppableNode(node: FlowNodeEntity) {
    // 没有拖拽节点时，所有节点都不可 drop
    if (!this.dragging || this.isDragBranch) {
      return false;
    }

    // 当前节点 & 下一个节点是否在拖拽区域
    if (
      this.nodeDragIdsWithChildren.includes(node.id) ||
      (node.next && this.nodeDragIdsWithChildren.includes(node.next.id))
    ) {
      return false;
    }

    if (node.isInlineBlocks || node.isInlineBlock) {
      return false;
    }

    // 分组节点不能嵌套
    const hasGroupNode = this.dragNodes.some(
      (node) => node.flowNodeType === FlowNodeBaseType.GROUP
    );
    if (hasGroupNode) {
      const group = FlowGroupUtils.getNodeRecursionGroupController(node);
      if (group) {
        return false;
      }
    }

    return true;
  }

  /**
   * 拖拽分支是否可以释放在该分支
   * @param node 拖拽的分支节点
   * @param side 分支的前面还是后面
   */
  isDroppableBranch(node: FlowNodeEntity, side: LABEL_SIDE_TYPE = LABEL_SIDE_TYPE.NORMAL_BRANCH) {
    // 拖拽的是分支
    if (this.isDragBranch) {
      if (
        // 拖拽到分支
        !node.isInlineBlock ||
        // 只能在同一分支条件下
        node.parent !== this.dragStartNode.parent ||
        // 自己不能拖拽给自己
        node === this.dragStartNode
      ) {
        return false;
      }

      // 分支的下一个节点不是当前要拖拽的节点
      if (side === LABEL_SIDE_TYPE.NORMAL_BRANCH && node.next !== this.dragStartNode) {
        return true;
      }

      // 分支的前一个节点不是当前要拖拽的节点
      if (side === LABEL_SIDE_TYPE.PRE_BRANCH && node.pre !== this.dragStartNode) {
        return true;
      }
    }

    return false;
  }
}
