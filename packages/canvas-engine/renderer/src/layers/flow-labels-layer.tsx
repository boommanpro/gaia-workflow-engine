/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { throttle } from 'lodash-es';
import { inject, injectable } from 'inversify';
import { domUtils } from '@flowgram.ai/utils';
import {
  FlowDocument,
  FlowDocumentTransformerEntity,
  FlowNodeEntity,
  FlowNodeTransitionData,
  FlowRendererStateEntity,
} from '@flowgram.ai/document';
import { Layer, observeEntity, observeEntityDatas } from '@flowgram.ai/core';

import { useBaseColor } from '../hooks/use-base-color';
import { FlowRendererRegistry } from '../flow-renderer-registry';
import { createLabels } from '../components/LabelsRenderer';

@injectable()
export class FlowLabelsLayer extends Layer {
  @inject(FlowDocument) readonly document: FlowDocument;

  @inject(FlowRendererRegistry) readonly rendererRegistry: FlowRendererRegistry;

  node = domUtils.createDivWithClass('gedit-flow-labels-layer');

  @observeEntity(FlowDocumentTransformerEntity)
  readonly documentTransformer: FlowDocumentTransformerEntity;

  @observeEntity(FlowRendererStateEntity)
  readonly flowRenderState: FlowRendererStateEntity;

  /**
   * 监听 transition 变化
   */
  @observeEntityDatas(FlowNodeEntity, FlowNodeTransitionData)
  _transitions: FlowNodeTransitionData[];

  get transitions(): FlowNodeTransitionData[] {
    return this.document.getRenderDatas<FlowNodeTransitionData>(FlowNodeTransitionData);
  }

  /**
   * 监听缩放，目前采用整体缩放
   * @param scale
   */
  onZoom(scale: number) {
    this.node!.style.transform = `scale(${scale})`;
  }

  /**
   * 可视区域变化
   */
  onViewportChange: ReturnType<typeof throttle> = throttle(() => {
    this.render();
  }, 100);

  onReady() {
    // 图层顺序调整：节点 > label > 线条
    // 节点 z-index: 10
    this.node.style.zIndex = '9';
  }

  /**
   * 监听readonly和 disabled 状态 并刷新layer, 并刷新
   */
  onReadonlyOrDisabledChange() {
    this.render();
  }

  render() {
    const labels: JSX.Element[] = [];
    if (this.documentTransformer?.loading) return <></>;
    this.documentTransformer?.refresh?.();
    const { baseActivatedColor, baseColor } = useBaseColor();
    const isViewportVisible = this.config.isViewportVisible.bind(this.config);
    this.transitions.forEach((transition) => {
      createLabels({
        data: transition,
        rendererRegistry: this.rendererRegistry,
        isViewportVisible,
        labelsSave: labels,
        getLabelColor: (activated) => (activated ? baseActivatedColor : baseColor),
      });
    });
    // 这里采用扁平化的 react 结构性能更高
    return <>{labels}</>;
  }
}
