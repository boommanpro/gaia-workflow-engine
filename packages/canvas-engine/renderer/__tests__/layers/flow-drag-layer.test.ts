/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Container, decorate, injectable, type interfaces } from 'inversify';
import {
  FlowDocument,
  FlowDocumentContainerModule,
  FlowDocumentContribution,
} from '@flowgram.ai/document';
import {
  createDefaultPlaygroundConfig,
  PlaygroundConfig,
  PlaygroundContainerModule,
} from '@flowgram.ai/core';

import { FlowRendererRegistry } from '../../src/flow-renderer-registry';
import { FlowRendererContribution } from '../../src/flow-renderer-contribution';
import { FlowDragLayer, FlowRendererContainerModule } from '../../src';
import { flowJson } from '../../__mocks__/flow-json.mock';
import { FlowDocumentMockRegister } from '../../__mocks__/flow-document-container.mock';

class FlowRenderMockRegister implements FlowRendererContribution {
  registerRenderer(registry: FlowRendererRegistry): void {
    registry.registerLayers(FlowDragLayer);
  }
}

decorate(injectable(), FlowRenderMockRegister);

function createDocumentContainer(): interfaces.Container {
  const container = new Container();
  container.load(FlowDocumentContainerModule);
  container.bind(FlowDocumentContribution).to(FlowDocumentMockRegister);
  return container;
}

// layer 层 drag entity 单测
describe('flow-drag-layer', () => {
  let container = createDocumentContainer();
  let document: FlowDocument;
  let registry: FlowRendererRegistry;

  beforeEach(() => {
    container = createDocumentContainer();
    container.load(FlowRendererContainerModule);
    container.load(PlaygroundContainerModule);
    container.bind(FlowRendererContribution).to(FlowRenderMockRegister);
    container.bind(PlaygroundConfig).toConstantValue(createDefaultPlaygroundConfig());

    document = container.get<FlowDocument>(FlowDocument);
    document.fromJSON(flowJson);
    registry = container.get<FlowRendererRegistry>(FlowRendererRegistry);
    registry.init();
  });

  // 测试初始化
  // it('test ready', () => {
  //   expect(registry.pipeline.renderer.layers.map(layer => layer?.onReady?.())).toMatchSnapshot();
  // });

  // 渲染
  it('test ready', () => {
    registry.pipeline.renderer.layers.forEach(layer => {
      expect(layer.render?.()).toMatchSnapshot();
    });
  });
});
