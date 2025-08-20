/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container, decorate, injectable, type interfaces } from 'inversify';
import { render } from '@testing-library/react';
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

import { FlowLabelsLayer } from '../../src/layers/flow-labels-layer';
import { FlowRendererRegistry, FlowTextKey } from '../../src/flow-renderer-registry';
import { FlowRendererContribution } from '../../src/flow-renderer-contribution';
import { FlowRendererContainerModule } from '../../src/flow-renderer-container-module';
import { flowJson } from '../../__mocks__/flow-mock-node-json';
import { FlowLabelsMockRegister } from '../../__mocks__/flow-labels-mock-register';
import { FlowDocumentMockRegister } from '../../__mocks__/flow-document-container.mock';

class FlowRenderMockRegister implements FlowRendererContribution {
  registerRenderer(registry: FlowRendererRegistry): void {
    registry.registerLayers(FlowLabelsLayer);
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
describe('flow-label-layer', () => {
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
    document.registerFlowNodes(
      FlowLabelsMockRegister, // 通过 getLabel 方法 mock label
    );
    document.fromJSON(flowJson);
    registry = container.get<FlowRendererRegistry>(FlowRendererRegistry);
    registry.init();
  });

  // 测试初始化
  it('test ready', () => {
    registry.pipeline.renderer.layers.forEach(layer => {
      layer?.onReady?.();
      expect(layer.node.style.zIndex).toEqual('9');
    });
  });

  // 缩放
  it('test zoom', () => {
    registry.pipeline.renderer.layers.forEach(layer => {
      layer?.onZoom?.(2);
      expect(layer.node!.style.transform).toEqual('scale(2)');
    });
  });

  // FIXME: render 单测目前不全
  // 渲染
  it('test render', () => {
    vi.mock('@flowgram.ai/core', async importOriginal => {
      const contextMaker = {
        makeFormItemMaterialContext: vi.fn().mockReturnValue('mock-context'),
        isDragBranch: true,
        labelSide: 'left',
        isDroppableBranch: () => true,
        dropNodeId: 'mock',
        dragging: true,
        isDroppableNode: () => true,
      };
      return {
        // @ts-ignore
        ...(await importOriginal()),
        // mock Adder 组件里的 useService
        useService: vi.fn().mockReturnValue(contextMaker),
      };
    });
    const res: (JSX.Element | undefined)[] = [];

    registry.pipeline.renderer.layers.forEach(layer => {
      const render = (layer as any)?._render?.bind(layer);
      // mock rendererRegistry
      // @ts-ignore
      layer.rendererRegistry = {
        getRendererComponent: () => ({
          renderer: () => null,
        }),
        getText: key => {
          if (key === FlowTextKey.LOOP_WHILE_TEXT) {
            return '123';
          }
          return;
        },
      };
      res.push(render());
    });

    const app = render(<>{res}</>);
    expect(app.asFragment()).toMatchSnapshot();
  });
});
