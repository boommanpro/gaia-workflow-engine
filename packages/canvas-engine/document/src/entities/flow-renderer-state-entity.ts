/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { debounce } from 'lodash-es';
import { type Disposable } from '@flowgram.ai/utils';
import { ConfigEntity, type EntityOpts } from '@flowgram.ai/core';

import { LABEL_SIDE_TYPE } from '../typings';
import { type FlowNodeEntity } from './flow-node-entity';

interface FlowRendererStateEntityConfig extends EntityOpts {}

interface FlowRendererState {
  nodeHoveredId?: string;
  nodeDroppingId?: string;
  nodeDragStartId?: string;
  nodeDragIds?: string[]; // 框选批量拖拽
  nodeDragIdsWithChildren?: string[]; // 批量拖拽（含子节点）
  dragLabelSide?: LABEL_SIDE_TYPE;
  dragging?: boolean;
  isBranch?: boolean;
}
/**
 * 渲染相关的全局状态管理
 */
export class FlowRendererStateEntity extends ConfigEntity<
  FlowRendererState,
  FlowRendererStateEntityConfig
> {
  static type = 'FlowRendererStateEntity';

  getDefaultConfig() {
    return {};
  }

  constructor(conf: FlowRendererStateEntityConfig) {
    super(conf);
  }

  getNodeHovered(): FlowNodeEntity | undefined {
    return this.config.nodeHoveredId
      ? this.entityManager.getEntityById(this.config.nodeHoveredId)
      : undefined;
  }

  setNodeHovered(node: FlowNodeEntity | undefined): void {
    this.updateConfig({
      nodeHoveredId: node?.id,
    });
  }

  get dragging() {
    return this.config.dragging;
  }

  setDragging(dragging: boolean) {
    this.updateConfig({
      dragging,
    });
  }

  get isBranch() {
    return this.config.isBranch;
  }

  setIsBranch(isBranch: boolean) {
    this.updateConfig({
      isBranch,
    });
  }

  getDragLabelSide(): LABEL_SIDE_TYPE | undefined {
    return this.config.dragLabelSide;
  }

  setDragLabelSide(dragLabelSide?: LABEL_SIDE_TYPE): void {
    this.updateConfig({
      dragLabelSide,
    });
  }

  getNodeDroppingId(): string | undefined {
    return this.config.nodeDroppingId;
  }

  setNodeDroppingId(nodeDroppingId?: string): void {
    this.updateConfig({
      nodeDroppingId,
    });
  }

  getDragStartEntity(): FlowNodeEntity | undefined {
    const { nodeDragStartId } = this.config;
    return this.entityManager.getEntityById(nodeDragStartId!);
  }

  setDragStartEntity(node?: FlowNodeEntity): void {
    this.updateConfig({
      nodeDragStartId: node?.id,
    });
  }

  // 拖拽多个节点时
  getDragEntities(): FlowNodeEntity[] {
    const { nodeDragIds } = this.config;
    return (nodeDragIds || []).map((_id) => this.entityManager.getEntityById(_id)!);
  }

  // 设置拖拽的节点
  setDragEntities(nodes: FlowNodeEntity[]): void {
    this.updateConfig({
      nodeDragIds: nodes.map((_node) => _node.id),
      nodeDragIdsWithChildren: nodes
        .map((_node) => [_node.id, ..._node.allCollapsedChildren.map((_n) => _n.id)])
        .flat(),
    });
  }

  onNodeHoveredChange(
    fn: (hoveredNode: FlowNodeEntity | undefined) => void,
    debounceTime = 100 // 延迟执行避免频繁 hover
  ): Disposable {
    return this.onConfigChanged(debounce(() => fn(this.getNodeHovered()), debounceTime));
  }
}
