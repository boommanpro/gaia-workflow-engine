/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container, decorate, injectable, type interfaces } from 'inversify';
import {
  FlowDocument,
  FlowDocumentContainerModule,
  FlowDocumentContribution,
} from '@flowgram.ai/document';
import {
  createDefaultPlaygroundConfig,
  PlaygroundConfig,
  PlaygroundConfigEntity,
  PlaygroundContainerModule,
} from '@flowgram.ai/core';

import { FlowRendererRegistry } from '../../src/flow-renderer-registry';
import { FlowRendererContribution } from '../../src/flow-renderer-contribution';
import { FlowRendererContainerModule } from '../../src/flow-renderer-container-module';
import { FlowLinesLayer, FlowNodesTransformLayer } from '../../src';
import { flowJson } from '../../__mocks__/flow-json.mock';
import { FlowDocumentMockRegister } from '../../__mocks__/flow-document-container.mock';

class FlowRenderMockRegister implements FlowRendererContribution {
  registerRenderer(registry: FlowRendererRegistry): void {
    registry.registerLayers(FlowLinesLayer);
  }
}

decorate(injectable(), FlowRenderMockRegister);

function createDocumentContainer(): interfaces.Container {
  const container = new Container();
  container.load(FlowDocumentContainerModule);
  container.bind(FlowDocumentContribution).to(FlowDocumentMockRegister);
  return container;
}

describe('flow-lines-layer', () => {
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
    document.init();
    document.fromJSON(flowJson);
    registry = container.get<FlowRendererRegistry>(FlowRendererRegistry);
    registry.init();

    // Mock the ResizeObserver
    const ResizeObserverMock = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Stub the global ResizeObserver
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  // 测试初始化
  it('test ready', () => {
    registry.pipeline.renderer.layers.forEach((layer) => {
      (layer as FlowLinesLayer).onReady();
      expect(layer.node.style.zIndex).toEqual('1');
    });
  });

  // 缩放
  it('test zoom', () => {
    const config = container.get<PlaygroundConfigEntity>(PlaygroundConfigEntity);
    config.updateConfig({ zoom: 2 });
    registry.pipeline.renderer.layers.forEach((layer) => {
      const linesLayer = layer as FlowLinesLayer;
      linesLayer.onZoom();
      expect(linesLayer.viewBox).toEqual('0 0 500 500');
    });
  });

  // FIXME: render 单测目前不全
});
