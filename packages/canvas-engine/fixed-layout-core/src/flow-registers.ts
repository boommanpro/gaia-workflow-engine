/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import {
  FlowLabelsLayer,
  FlowLinesLayer,
  FlowNodesContentLayer,
  FlowNodesTransformLayer,
  type FlowRendererContribution,
  type FlowRendererRegistry,
} from '@flowgram.ai/renderer';
import {
  type FlowDocument,
  type FlowDocumentContribution,
  FlowNodeRenderData,
  FlowNodeTransformData,
  FlowNodeTransitionData,
} from '@flowgram.ai/document';
import { type PlaygroundContribution, PlaygroundLayer } from '@flowgram.ai/core';

import { EndRegistry } from './activities/end';
import {
  BlockIconRegistry,
  BlockOrderIconRegistry,
  BlockRegistry,
  DynamicSplitRegistry,
  EmptyRegistry,
  InlineBlocksRegistry,
  LoopRegistry,
  RootRegistry,
  StartRegistry,
  StaticSplitRegistry,
  TryCatchRegistry,
  SimpleSplitRegistry,
  BreakRegistry,
  MultiOuputsRegistry,
  MultiInputsRegistry,
  InputRegistry,
  OuputRegistry,
  SlotRegistry,
  SlotBlockRegistry,
} from './activities';

@injectable()
export class FlowRegisters
  implements FlowDocumentContribution, FlowRendererContribution, PlaygroundContribution
{
  /**
   * 注册数据层
   * @param document
   */
  registerDocument(document: FlowDocument) {
    /**
     * 注册节点 (ECS - Entity)
     */
    document.registerFlowNodes(
      RootRegistry, // 根节点
      StartRegistry, // 开始节点
      DynamicSplitRegistry, // 动态分支（并行、排他）
      StaticSplitRegistry, // 静态分支（审批）
      SimpleSplitRegistry, // 简单分支 （不带 orderIcon 节点）
      BlockRegistry, // 单条 block 注册
      InlineBlocksRegistry, // 多个 block 组成的 block 列表
      BlockIconRegistry, // icon 节点，如条件分支的菱形图标
      BlockOrderIconRegistry, // 带顺序的图标节点，一般为 block 第一个分支节点
      TryCatchRegistry, // TryCatch
      EndRegistry, // 结束节点
      LoopRegistry, // 循环节点
      EmptyRegistry, // 占位节点
      BreakRegistry, // 分支断开
      MultiOuputsRegistry,
      MultiInputsRegistry,
      InputRegistry,
      OuputRegistry,
      SlotRegistry,
      SlotBlockRegistry
    );
    /**
     * 注册节点数据 (ECS - Component)
     */
    document.registerNodeDatas(
      FlowNodeRenderData, // 渲染节点相关数据
      FlowNodeTransitionData, // 线条绘制数据
      FlowNodeTransformData // 坐标计算数据
    );
  }

  /**
   * 注册渲染层
   * @param renderer
   */
  registerRenderer(renderer: FlowRendererRegistry) {
    /**
     * 注册 layer (ECS - System)
     */
    renderer.registerLayers(
      FlowNodesTransformLayer, // 节点位置渲染
      FlowNodesContentLayer, // 节点内容渲染
      FlowLinesLayer, // 线条渲染
      FlowLabelsLayer, // Label 渲染
      PlaygroundLayer // 画布基础层，提供缩放、手势等能力
    );
  }

  /**
   * 画布开始渲染 (hook)
   */
  onReady(): void {}

  /**
   * 画布销毁 (hook)
   */
  onDispose(): void {}
}
