/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle } from '@flowgram.ai/utils';

import { FlowNodeEntity } from '../../entities';
import { FlowNodeRenderData, FlowNodeTransformData } from '../../datas';
import { FlowGroupUtils } from './flow-group-utils';

/** 分组控制器 */
export class FlowGroupController {
  private constructor(public readonly groupNode: FlowNodeEntity) {}

  public get nodes(): FlowNodeEntity[] {
    return this.groupNode.collapsedChildren || [];
  }

  public get collapsed(): boolean {
    const groupTransformData = this.groupNode.getData<FlowNodeTransformData>(FlowNodeTransformData);
    return groupTransformData.collapsed;
  }

  public collapse(): void {
    this.collapsed = true;
  }

  public expand(): void {
    this.collapsed = false;
  }

  /** 获取分组外围的最大边框 */
  public get bounds(): Rectangle {
    const groupNodeBounds =
      this.groupNode.getData<FlowNodeTransformData>(FlowNodeTransformData).bounds;
    return groupNodeBounds;
  }

  /** 是否是开始节点 */
  public isStartNode(node?: FlowNodeEntity): boolean {
    if (!node) {
      return false;
    }
    const nodes = this.nodes;
    if (!nodes[0]) {
      return false;
    }
    return node.id === nodes[0].id;
  }

  /** 是否是结束节点 */
  public isEndNode(node?: FlowNodeEntity): boolean {
    if (!node) {
      return false;
    }
    const nodes = this.nodes;
    if (!nodes[nodes.length - 1]) {
      return false;
    }
    return node.id === nodes[nodes.length - 1].id;
  }

  public set note(note: string) {
    this.groupNode.getNodeMeta().note = note;
  }

  public get note(): string {
    return this.groupNode.getNodeMeta().note || '';
  }

  public set noteHeight(height: number) {
    this.groupNode.getNodeMeta().noteHeight = height;
  }

  public get noteHeight(): number {
    return this.groupNode.getNodeMeta().noteHeight || 0;
  }

  public get positionConfig(): Record<string, number> {
    return this.groupNode.getNodeMeta().positionConfig;
  }

  private set collapsed(collapsed: boolean) {
    const groupTransformData = this.groupNode.getData<FlowNodeTransformData>(FlowNodeTransformData);
    groupTransformData.collapsed = collapsed;
    groupTransformData.localDirty = true;
    if (groupTransformData.parent) groupTransformData.parent.localDirty = true;
    if (groupTransformData.parent?.firstChild)
      groupTransformData.parent.firstChild.localDirty = true;
  }

  public set hovered(hovered: boolean) {
    const groupRenderData = this.groupNode.getData<FlowNodeRenderData>(FlowNodeRenderData);
    if (hovered) {
      groupRenderData.toggleMouseEnter();
    } else {
      groupRenderData.toggleMouseLeave();
    }
    if (groupRenderData.hovered === hovered) {
      return;
    }
    groupRenderData.hovered = hovered;
  }

  public get hovered(): boolean {
    const groupRenderData = this.groupNode.getData<FlowNodeRenderData>(FlowNodeRenderData);
    return groupRenderData.hovered;
  }

  public static create(groupNode?: FlowNodeEntity): FlowGroupController | undefined {
    if (!groupNode) {
      return;
    }
    if (!FlowGroupUtils.isGroupNode(groupNode)) {
      return;
    }
    return new FlowGroupController(groupNode);
  }
}
