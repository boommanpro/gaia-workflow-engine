/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { Rectangle } from '@flowgram.ai/utils';
import {
  WorkflowDocument,
  WorkflowLineEntity,
  WorkflowNodeEntity,
  WorkflowNodeLinesData,
} from '@flowgram.ai/free-layout-core';
import { Playground } from '@flowgram.ai/core';

import { AutoLayoutOptions } from './type';
import { LayoutConfig, LayoutEdge, LayoutNode } from './layout/type';
import { DefaultLayoutOptions } from './layout/constant';
import { DefaultLayoutConfig, Layout, type LayoutOptions } from './layout';

@injectable()
export class AutoLayoutService {
  @inject(Playground)
  private playground: Playground;

  @inject(WorkflowDocument) private readonly document: WorkflowDocument;

  private layoutConfig: LayoutConfig = DefaultLayoutConfig;

  public init(options: AutoLayoutOptions) {
    this.layoutConfig = {
      ...this.layoutConfig,
      ...options.layoutConfig,
    };
  }

  public async layout(options: Partial<LayoutOptions> = {}): Promise<void> {
    const layoutOptions: LayoutOptions = {
      ...DefaultLayoutOptions,
      ...options,
    };
    const containerNode = layoutOptions.containerNode ?? this.document.root;
    const container = this.createLayoutNode(containerNode, options);
    const layouts = await this.layoutNode(container, layoutOptions);
    const rect = this.getLayoutNodeRect(container);
    const positionPromise = layouts.map((layout) => layout.position());
    const fitViewPromise = this.fitView(layoutOptions, rect);
    await Promise.all([...positionPromise, fitViewPromise]);
  }

  private async fitView(options: LayoutOptions, rect: Rectangle): Promise<void> {
    if (options.disableFitView === true) {
      return;
    }
    // 留出 30 像素的边界
    return this.playground.config.fitView(rect, options.enableAnimation, 30);
  }

  private async layoutNode(container: LayoutNode, options: LayoutOptions): Promise<Layout[]> {
    const { layoutNodes, layoutEdges } = container;
    if (layoutNodes.length === 0) {
      return [];
    }
    // 触发子节点布局
    const childrenLayouts = (
      await Promise.all(layoutNodes.map((n) => this.layoutNode(n, options)))
    ).flat();
    const layoutConfig: LayoutConfig = {
      ...this.layoutConfig,
      ...options.layoutConfig,
    };
    const layout = new Layout(layoutConfig);
    layout.init({ container, layoutNodes, layoutEdges }, options);
    layout.layout();
    const rect = this.getLayoutNodeRect(container);
    container.size = {
      width: rect.width,
      height: rect.height,
    };
    return [...childrenLayouts, layout];
  }

  private createLayoutNodes(nodes: WorkflowNodeEntity[], options: LayoutOptions): LayoutNode[] {
    return nodes.map((node) => this.createLayoutNode(node, options));
  }

  /** 创建节点布局数据 */
  private createLayoutNode(node: WorkflowNodeEntity, options: LayoutOptions): LayoutNode {
    const blocks = node.blocks.filter((blockNode) =>
      options.filterNode ? options.filterNode?.({ node: blockNode, parent: node.parent }) : true
    );
    const edges = this.getNodesAllLines(blocks);

    // 创建子布局节点
    const layoutNodes = this.createLayoutNodes(blocks, options);
    const layoutEdges = this.createLayoutEdges(edges);

    const { bounds, padding } = node.transform;
    const { width, height, center } = bounds;
    const { x, y } = center;
    const layoutNode: LayoutNode = {
      id: node.id,
      entity: node,
      index: '', // 初始化时，index 未计算
      rank: -1, // 初始化时，节点还未布局，层级为-1
      order: -1, // 初始化时，节点还未布局，顺序为-1
      position: { x, y },
      offset: { x: 0, y: 0 },
      padding,
      size: { width, height },
      layoutNodes,
      layoutEdges,
    };
    return layoutNode;
  }

  private createLayoutEdges(edges: WorkflowLineEntity[]): LayoutEdge[] {
    const layoutEdges = edges
      .map((edge) => this.createLayoutEdge(edge))
      .filter(Boolean) as LayoutEdge[];
    return layoutEdges;
  }

  /** 创建线条布局数据 */
  private createLayoutEdge(edge: WorkflowLineEntity): LayoutEdge | undefined {
    const { from, to } = edge.info;
    if (!from || !to || edge.vertical) {
      return;
    }
    const layoutEdge: LayoutEdge = {
      id: edge.id,
      entity: edge,
      from,
      to,
      fromIndex: '', // 初始化时，index 未计算
      toIndex: '', // 初始化时，index 未计算
      name: edge.id,
    };
    return layoutEdge;
  }

  private getNodesAllLines(nodes: WorkflowNodeEntity[]): WorkflowLineEntity[] {
    const lines = nodes
      .map((node) => {
        const linesData = node.getData<WorkflowNodeLinesData>(WorkflowNodeLinesData);
        const outputLines = linesData.outputLines.filter(Boolean);
        const inputLines = linesData.inputLines.filter(Boolean);
        return [...outputLines, ...inputLines];
      })
      .flat();

    return lines;
  }

  private getLayoutNodeRect(layoutNode: LayoutNode): Rectangle {
    const rects = layoutNode.layoutNodes.map((node) => this.layoutNodeRect(node));
    const rect = Rectangle.enlarge(rects);
    const { padding } = layoutNode;
    const width = rect.width + padding.left + padding.right;
    const height = rect.height + padding.top + padding.bottom;
    const x = rect.x - padding.left;
    const y = rect.y - padding.top;
    return new Rectangle(x, y, width, height);
  }

  private layoutNodeRect(layoutNode: LayoutNode): Rectangle {
    const { width, height } = layoutNode.size;
    const x = layoutNode.position.x - width / 2;
    const y = layoutNode.position.y - height / 2;
    return new Rectangle(x, y, width, height);
  }
}
