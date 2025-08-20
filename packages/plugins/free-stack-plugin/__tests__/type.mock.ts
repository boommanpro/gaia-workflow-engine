/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { EntityManager, PipelineRegistry, PipelineRenderer } from '@flowgram.ai/core';
import type {
  WorkflowDocument,
  WorkflowHoverService,
  WorkflowLineEntity,
  WorkflowNodeEntity,
  WorkflowSelectService,
} from '@flowgram.ai/free-layout-core';
import type { Disposable } from '@flowgram.ai/utils';

import type { StackingContext } from '../src/type';
import type { StackingComputeMode } from '../src/constant';

/** mock类型便于测试内部方法 */
export interface IStackingContextManager {
  document: WorkflowDocument;
  entityManager: EntityManager;
  pipelineRenderer: PipelineRenderer;
  pipelineRegistry: PipelineRegistry;
  hoverService: WorkflowHoverService;
  selectService: WorkflowSelectService;
  node: HTMLDivElement;
  disposers: Disposable[];
  mode: StackingComputeMode;
  init(mode?: StackingComputeMode): void;
  ready(): void;
  dispose(): void;
  compute(): void;
  _compute(): void;
  stackingCompute(): void;
  nodes: WorkflowNodeEntity[];
  lines: WorkflowLineEntity[];
  context: StackingContext;
  mountListener(): void;
  onZoom(): Disposable;
  onHover(): Disposable;
  onEntityChange(): Disposable;
  onSelect(): Disposable;
}

export interface IStackingComputing {
  currentLevel: number;
  topLevel: number;
  maxLevel: number;
  nodeIndexes: Map<string, number>;
  nodeLevel: Map<string, number>;
  lineLevel: Map<string, number>;
  context: StackingContext;
  compute(params: {
    root: WorkflowNodeEntity;
    nodes: WorkflowNodeEntity[];
    context: StackingContext;
  }): {
    nodeLevel: Map<string, number>;
    lineLevel: Map<string, number>;
    topLevel: number;
    maxLevel: number;
  };
  clearCache(): void;
  computeNodeIndexesMap(nodes: WorkflowNodeEntity[]): Map<string, number>;
  computeTopLevel(nodes: WorkflowNodeEntity[]): number;
  layerHandler(nodes: WorkflowNodeEntity[], pinTop?: boolean): void;
  getLevel(pinTop: boolean): number;
  levelIncrease(): void;
}
