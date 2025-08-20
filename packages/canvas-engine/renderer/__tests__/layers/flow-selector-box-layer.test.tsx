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
import {
  FlowSelectorBoxLayer,
  FlowRendererContainerModule,
  FlowSelectConfigEntity,
} from '../../src';
import { flowJson } from '../../__mocks__/flow-json.mock';
import { FlowDocumentMockRegister } from '../../__mocks__/flow-document-container.mock';

class FlowRenderMockRegister implements FlowRendererContribution {
  registerRenderer(registry: FlowRendererRegistry): void {
    registry.registerLayers(FlowSelectorBoxLayer);
  }
}

decorate(injectable(), FlowRenderMockRegister);

function createDocumentContainer(): interfaces.Container {
  const container = new Container();
  container.load(FlowDocumentContainerModule);
  container.bind(FlowDocumentContribution).to(FlowDocumentMockRegister);
  return container;
}

// box layer 单测
describe('flow-selector-box-layer', () => {
  let container = createDocumentContainer();
  let document: any;
  let registry: FlowRendererRegistry;

  beforeEach(() => {
    container = createDocumentContainer();
    container.load(FlowRendererContainerModule);
    container.load(PlaygroundContainerModule);
    container.bind(FlowRendererContribution).to(FlowRenderMockRegister);
    container.bind(PlaygroundConfig).toConstantValue(createDefaultPlaygroundConfig());
    container.bind(FlowSelectConfigEntity).toSelf().inSingletonScope();

    document = container.get<typeof FlowDocument>(FlowDocument as any);
    document.fromJSON(flowJson);
    registry = container.get<FlowRendererRegistry>(FlowRendererRegistry);
    registry.init();
  });

  // 渲染, FIXME 补充单测
  it('test ready', () => {
    registry.pipeline.renderer.layers.forEach(layer => {
      // layer.onReady();
      expect(layer.render?.()).toMatchSnapshot();
    });
  });
});
