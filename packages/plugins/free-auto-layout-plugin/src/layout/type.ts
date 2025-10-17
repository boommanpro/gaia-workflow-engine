/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { WorkflowLineEntity, WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';

export interface LayoutStoreData {
  nodes: Map<string, LayoutNode>;
  edges: Map<string, LayoutEdge>;
}

export interface ILayoutStore {
  container: LayoutNode;
  options: LayoutOptions;
  get initialized(): boolean;
  getNode(id?: string): LayoutNode | undefined;
  getNodeByIndex(index: string): LayoutNode | undefined;
  getEdge(id: string): LayoutEdge | undefined;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  create(params: LayoutParams, options: LayoutOptions): void;
}

export interface ILayout {
  init(params: LayoutParams, options: LayoutOptions): void;
  layout(): void;
  position(): Promise<void>;
}

export interface LayoutSize {
  width: number;
  height: number;
}

export interface LayoutNode {
  id: string;
  /** 节点索引 */
  index: string;
  /** 节点实体 */
  entity: WorkflowNodeEntity;
  /** 层级 */
  rank: number;
  /** 顺序 */
  order: number;
  /** 位置 */
  position: {
    x: number;
    y: number;
  };
  /** 偏移量 */
  offset: {
    x: number;
    y: number;
  };
  /** 边距 */
  padding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** 宽高 */
  size: LayoutSize;
  /** 子节点 */
  layoutNodes: LayoutNode[];
  /** 子线条 */
  layoutEdges: LayoutEdge[];
  /** 被跟随节点 */
  followedBy?: string[];
  /** 跟随节点 */
  followTo?: string;
}

export interface LayoutEdge {
  id: string;
  /** 线条实体 */
  entity: WorkflowLineEntity;
  /** 起点 */
  from: string;
  /** 终点 */
  to: string;
  /** 起点索引 */
  fromIndex: string;
  /** 终点索引 */
  toIndex: string;
  /** 线条名称 */
  name: string;
}

export interface DagreNode {
  width: number;
  height: number;
  order: number;
  rank: number;
}

export interface LayoutParams {
  container: LayoutNode;
  layoutNodes: LayoutNode[];
  layoutEdges: LayoutEdge[];
}

export interface LayoutOptions {
  layoutConfig?: Partial<LayoutConfig>;
  containerNode?: WorkflowNodeEntity;
  getFollowNode?: GetFollowNode;
  enableAnimation?: boolean;
  animationDuration?: number;
  disableFitView?: boolean;
  filterNode?: (params: { node: WorkflowNodeEntity; parent?: WorkflowNodeEntity }) => boolean;
}

export interface LayoutConfig {
  /** Direction for rank nodes. Can be TB, BT, LR, or RL, where T = top, B = bottom, L = left, and R = right. */
  rankdir: 'TB' | 'BT' | 'LR' | 'RL';
  /** Alignment for rank nodes. Can be UL, UR, DL, or DR, where U = up, D = down, L = left, and R = right. */
  align: 'UL' | 'UR' | 'DL' | 'DR' | undefined;
  /** Number of pixels that separate nodes horizontally in the layout. */
  nodesep: number;
  /** Number of pixels that separate edges horizontally in the layout. */
  edgesep: number;
  /** Number of pixels that separate edges horizontally in the layout. */
  ranksep: number;
  /** Number of pixels to use as a margin around the left and right of the graph. */
  marginx: number;
  /** Number of pixels to use as a margin around the top and bottom of the graph. */
  marginy: number;
  /** If set to greedy, uses a greedy heuristic for finding a feedback arc set for a graph. A feedback arc set is a set of edges that can be removed to make a graph acyclic. */
  acyclicer: 'greedy' | undefined;
  /** Type of algorithm to assigns a rank to each node in the input graph. Possible values: network-simplex, tight-tree or longest-path */
  ranker: 'network-simplex' | 'tight-tree' | 'longest-path';
}

export type GetFollowNode = (
  node: LayoutNode,
  context: {
    store: ILayoutStore;
    /** 业务自定义参数 */
    [key: string]: any;
  }
) =>
  | {
      followTo?: string;
    }
  | undefined;
