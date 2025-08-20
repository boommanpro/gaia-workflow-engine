import type { WorkflowLineEntity, WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';

import { LayoutStore } from './store';

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
  /** 宽高 */
  size: {
    width: number;
    height: number;
  };
  /** 是否存在子节点 */
  hasChildren: boolean;
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
  nodes: WorkflowNodeEntity[];
  edges: WorkflowLineEntity[];
  container: WorkflowNodeEntity;
}

export interface LayoutOptions {
  getFollowNode?: GetFollowNode;
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
    store: LayoutStore;
    /** 业务自定义参数 */
    [key: string]: any;
  }
) =>
  | {
      followTo?: string;
    }
  | undefined;
