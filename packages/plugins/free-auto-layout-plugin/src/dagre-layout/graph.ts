/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowLineEntity, WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { TransformData } from '@flowgram.ai/core';

import type { ILayoutGraph, LayoutEdge, LayoutNode } from './type';

export class LayoutGraph implements ILayoutGraph {
  public readonly store: {
    nodes: Map<string, LayoutNode>;
    edges: Map<string, LayoutEdge>;
  } = {
    nodes: new Map(),
    edges: new Map(),
  };

  public get nodes(): LayoutNode[] {
    return Array.from(this.store.nodes.values());
  }

  public get edges(): LayoutEdge[] {
    return Array.from(this.store.edges.values());
  }

  public getNode(id: string): LayoutNode | undefined {
    return this.store.nodes.get(id);
  }

  public hasNode(id: string): boolean {
    return this.store.nodes.has(id);
  }

  public addNode(nodeEntity: WorkflowNodeEntity): LayoutNode {
    const transform = nodeEntity.getData(TransformData);
    const layoutNode: LayoutNode = {
      id: nodeEntity.id,
      node: nodeEntity,
      rank: -1,
      order: -1,
      position: { x: transform.position.x, y: transform.position.y },
      size: { width: transform.bounds.width, height: transform.bounds.height },
    };
    this.store.nodes.set(layoutNode.id, layoutNode);
    return layoutNode;
  }

  public addLayoutNode(layoutNode: LayoutNode): void {
    this.store.nodes.set(layoutNode.id, layoutNode);
  }

  public addEdge(edgeEntity: WorkflowLineEntity): LayoutEdge {
    const layoutEdge: LayoutEdge = {
      id: edgeEntity.id,
      from: edgeEntity.from.id,
      to: edgeEntity.to!.id,
    };
    this.store.edges.set(layoutEdge.id, layoutEdge);
    return layoutEdge;
  }

  public addLayoutEdge(layoutEdge: LayoutEdge): void {
    this.store.edges.set(layoutEdge.id, layoutEdge);
  }

  public removeEdge(id: string): void {
    this.store.edges.delete(id);
  }
}
