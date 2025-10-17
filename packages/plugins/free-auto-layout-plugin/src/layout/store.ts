/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { FlowNodeBaseType } from '@flowgram.ai/document';

import type {
  GetFollowNode,
  ILayoutStore,
  LayoutConfig,
  LayoutEdge,
  LayoutNode,
  LayoutOptions,
  LayoutParams,
  LayoutStoreData,
} from './type';

export class LayoutStore implements ILayoutStore {
  private indexMap: Map<string, string>;

  private init: boolean = false;

  private store: LayoutStoreData;

  public options: LayoutOptions;

  public container: LayoutNode;

  constructor(public readonly config: LayoutConfig) {}

  public get initialized(): boolean {
    return this.init;
  }

  public getNode(id?: string): LayoutNode | undefined {
    if (!id) {
      return undefined;
    }
    return this.store.nodes.get(id);
  }

  public getNodeByIndex(index: string): LayoutNode | undefined {
    const id = this.indexMap.get(index);
    return id ? this.getNode(id) : undefined;
  }

  public getEdge(id: string): LayoutEdge | undefined {
    return this.store.edges.get(id);
  }

  public get nodes(): LayoutNode[] {
    return Array.from(this.store.nodes.values());
  }

  public get edges(): LayoutEdge[] {
    return Array.from(this.store.edges.values());
  }

  public create(params: LayoutParams, options: LayoutOptions): void {
    this.container = params.container;
    this.store = this.createStore(params);
    this.indexMap = this.createIndexMap();
    this.setOptions(options);
    this.init = true;
  }

  /** 创建布局数据 */
  private createStore(params: LayoutParams): LayoutStoreData {
    const { layoutNodes, layoutEdges } = params;
    const virtualEdges = this.createVirtualEdges(params);
    const store = {
      nodes: new Map(),
      edges: new Map(),
    };
    layoutNodes.forEach((node) => store.nodes.set(node.id, node));
    layoutEdges.concat(virtualEdges).forEach((edge) => store.edges.set(edge.id, edge));
    return store;
  }

  /** 创建虚拟线条数据 */
  private createVirtualEdges(params: LayoutParams): LayoutEdge[] {
    const { layoutNodes, layoutEdges } = params;
    const nodes = layoutNodes.map((layoutNode) => layoutNode.entity);
    const edges = layoutEdges.map((layoutEdge) => layoutEdge.entity);
    const groupNodes = nodes.filter((n) => n.flowNodeType === FlowNodeBaseType.GROUP);
    const virtualEdges = groupNodes
      .map((group) => {
        const { id: groupId, blocks = [] } = group;
        const blockIdSet = new Set(blocks.map((b) => b.id));
        const groupFromEdges = edges
          .filter((edge) => blockIdSet.has(edge.to?.id ?? ''))
          .map((edge) => {
            const { from, to } = edge.info;
            if (!from || !to || edge.vertical) {
              return;
            }
            const id = `virtual_${groupId}_${to}`;
            const layoutEdge: LayoutEdge = {
              id: id,
              entity: edge,
              from,
              to: groupId,
              fromIndex: '', // 初始化时，index 未计算
              toIndex: '', // 初始化时，index 未计算
              name: id,
            };
            return layoutEdge;
          })
          .filter(Boolean) as LayoutEdge[];
        const groupToEdges = edges
          .filter((edge) => blockIdSet.has(edge.from?.id ?? ''))
          .map((edge) => {
            const { from, to } = edge.info;
            if (!from || !to || edge.vertical) {
              return;
            }
            const id = `virtual_${groupId}_${from}`;
            const layoutEdge: LayoutEdge = {
              id: id,
              entity: edge,
              from: groupId,
              to,
              fromIndex: '', // 初始化时，index 未计算
              toIndex: '', // 初始化时，index 未计算
              name: id,
            };
            return layoutEdge;
          })
          .filter(Boolean) as LayoutEdge[];
        return [...groupFromEdges, ...groupToEdges];
      })
      .flat();
    return virtualEdges;
  }

  /** 创建节点索引映射 */
  private createIndexMap(): Map<string, string> {
    const nodeIndexes = this.sortNodes();
    const nodeToIndex = new Map<string, string>();

    // 创建节点索引映射
    nodeIndexes.forEach((nodeId, nodeIndex) => {
      const node = this.getNode(nodeId);
      if (!node) {
        return;
      }
      const graphIndex = String(100000 + nodeIndex);
      nodeToIndex.set(node.id, graphIndex);
      node.index = graphIndex;
    });

    // 创建连线索引映射
    this.edges.forEach((edge) => {
      const fromIndex = nodeToIndex.get(edge.from);
      const toIndex = nodeToIndex.get(edge.to);
      if (!fromIndex || !toIndex) {
        this.store.edges.delete(edge.id);
        return;
      }
      edge.fromIndex = fromIndex;
      edge.toIndex = toIndex;
    });

    // 创建索引到节点的映射
    const indexToNode = new Map();
    nodeToIndex.forEach((index, id) => {
      indexToNode.set(index, id);
    });

    return indexToNode;
  }

  /** 节点排序 */
  private sortNodes(): Array<string> {
    // 节点 id 列表，id 可能重复
    const nodeIdList: string[] = [];

    // 第1级排序：按照 node 添加顺序排序
    this.nodes.forEach((node) => {
      nodeIdList.push(node.id);
    });

    // 第2级排序：被连线节点排序靠后
    this.edges.forEach((edge) => {
      nodeIdList.push(edge.to);
    });

    // 第3级排序：按照从开始节点进行遍历排序
    const visited = new Set<string>();
    const visit = (node?: WorkflowNodeEntity) => {
      if (!node || visited.has(node.id)) {
        return;
      }
      visited.add(node.id);
      nodeIdList.push(node.id);
      // 访问子节点
      node.blocks.forEach((child) => {
        visit(child);
      });
      // 访问后续节点
      const { outputLines } = node.lines;
      const sortedLines = outputLines.sort((a, b) => {
        const aNode = this.getNode(a.to?.id);
        const bNode = this.getNode(b.to?.id);
        const aPort = a.fromPort;
        const bPort = b.fromPort;
        // 同端口，对比to节点y轴坐标
        if (aPort === bPort && aNode && bNode) {
          return aNode.position.y - bNode.position.y;
        }
        // 同from节点的不同端口，对比端口y轴坐标
        if (aPort && bPort) {
          return aPort.point.y - bPort.point.y;
        }
        return 0;
      });
      sortedLines.forEach((line) => {
        const { to } = line;
        if (!to) {
          return;
        }
        visit(to);
      });
    };
    visit(this.container.entity);

    // 使用 reduceRight 去重并保留最后一个出现的节点 id
    const uniqueNodeIds: string[] = nodeIdList.reduceRight((acc: string[], nodeId: string) => {
      if (!acc.includes(nodeId)) {
        acc.unshift(nodeId);
      }
      return acc;
    }, []);

    return uniqueNodeIds;
  }

  /** 记录运行选项 */
  private setOptions(options: LayoutOptions): void {
    this.options = options;
    this.setFollowNode(options.getFollowNode);
  }

  /** 设置跟随节点配置 */
  private setFollowNode(getFollowNode?: GetFollowNode): void {
    if (!getFollowNode) return;
    const context = { store: this };
    this.nodes.forEach((node) => {
      const followTo = getFollowNode(node, context)?.followTo;
      if (!followTo) return;
      const followToNode = this.getNode(followTo);
      if (!followToNode) return;
      if (!followToNode.followedBy) {
        followToNode.followedBy = [];
      }
      followToNode.followedBy.push(node.id);
      node.followTo = followTo;
    });
  }
}
