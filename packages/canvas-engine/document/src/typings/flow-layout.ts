/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, PaddingSchema, ScrollSchema, SizeSchema } from '@flowgram.ai/utils';

import { type FlowNodeEntity } from '../entities';
import { type FlowNodeTransformData } from '../datas';

export const FlowLayout = Symbol('FlowLayout');
export const FlowLayoutContribution = Symbol('FlowLayoutContribution');

export enum FlowLayoutDefault {
  VERTICAL_FIXED_LAYOUT = 'vertical-fixed-layout', // 垂直固定布局
  HORIZONTAL_FIXED_LAYOUT = 'horizontal-fixed-layout', // 水平固定布局
}

export namespace FlowLayoutDefault {
  export function isVertical(layout: FlowLayout): boolean {
    return layout.name === FlowLayoutDefault.VERTICAL_FIXED_LAYOUT;
  }
}

export interface FlowLayoutContribution {
  onAfterUpdateLocalTransform?: (transform: FlowNodeTransformData, layout: FlowLayout) => void;
}

/**
 * 流程布局算法
 */
export interface FlowLayout {
  /**
   * 布局名字
   */
  name: string;
  /**
   * 布局切换时候触发
   */
  reload?(): void;
  /**
   * 更新布局
   */
  update(): void;

  /**
   * 获取节点的 padding 数据
   * @param node
   */
  getPadding(node: FlowNodeEntity): PaddingSchema;

  /**
   * 获取默认滚动 目前用在 scroll-limit-layer
   * @param contentSize
   */
  getInitScroll(contentSize: SizeSchema): ScrollSchema;

  /**
   * 获取默认输入点
   */
  getDefaultInputPoint(node: FlowNodeEntity): IPoint;

  /**
   * 获取默认输出点
   */
  getDefaultOutputPoint(node: FlowNodeEntity): IPoint;

  /**
   * 获取默认远点
   */
  getDefaultNodeOrigin(): IPoint;
}
