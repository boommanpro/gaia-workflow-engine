/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';

import { createPlaygroundContainer, createPlaygroundLayerDefault } from './playground-container';
import { Playground } from './playground';
import { LayerRegistry, Layer, PipelineLayerFactory } from './core';

/**
 * 画布测试工具
 *
 * @example
 *
 *  监听 layer 的执行
 *     const layerState = PlaygroundMockTools.createLayerTestState(PlaygroundLayer)
 *     layerState.playground.ready()
 *     expect(layerState.onReady.mock.calls.length).toEqual(1)
 *     expect(layerState.autorun.mock.calls.length).toEqual(1)
 *     layerState.playground.config.updateConfig({
 *       scrollX: 100
 *     })
 *     expect(layerState.onReady.mock.calls.length).toEqual(1)
 *     expect(layerState.autorun.mock.calls.length).toEqual(2)
 */
export namespace PlaygroundMockTools {
  const LayerStateProvider = Symbol('LayerStateProvider');
  type LayerStateProvider = WeakMap<LayerRegistry, LayerTestState>;

  interface SpyInstance {
    mock: {
      calls: any[][];
      instances: any[];
      invocationCallOrder: any;
      results: { type: string; value: any }[];
      lastCall: any[];
    };
  }
  export class LayerTestState<T extends Layer = Layer> {
    autorun: SpyInstance;

    render: SpyInstance;

    onReady: SpyInstance;

    onResize: SpyInstance;

    onFocus: SpyInstance;

    onBlur: SpyInstance;

    onZoom: SpyInstance;

    onScroll: SpyInstance;

    onViewportChange: SpyInstance;

    onReadonlyOrDisabledChange: SpyInstance;

    constructor(
      readonly instance: T,
      readonly playground: Playground,
      readonly container: interfaces.Container
    ) {
      this.hijackMethod(instance, 'autorun');
      this.hijackMethod(instance, 'render');
      this.hijackMethod(instance, 'onReady');
      this.hijackMethod(instance, 'onResize');
      this.hijackMethod(instance, 'onFocus');
      this.hijackMethod(instance, 'onBlur');
      this.hijackMethod(instance, 'onZoom');
      this.hijackMethod(instance, 'onScroll');
      this.hijackMethod(instance, 'onViewportChange');
      this.hijackMethod(instance, 'onReadonlyOrDisabledChange');
    }

    private hijackMethod(layer: Layer, layerMethod: keyof Layer & keyof LayerTestState): void {
      if (typeof layer[layerMethod] === 'function') {
        // vi should be global
        // @ts-ignore
        (this as any)[layerMethod] = vi.spyOn(layer as any, layerMethod);
      }
    }
  }

  export function createContainer(modules?: interfaces.ContainerModule[]): interfaces.Container {
    const container = createPlaygroundContainer();
    container.bind(LayerStateProvider).toConstantValue(new WeakMap());
    container
      .rebind(PipelineLayerFactory)
      .toDynamicValue((context) => (layerRegistry: LayerRegistry, options?: any) => {
        const layerInstance = createPlaygroundLayerDefault(
          context.container,
          layerRegistry,
          options
        );
        context.container
          .get<LayerStateProvider>(LayerStateProvider)
          .set(
            layerRegistry,
            new LayerTestState(layerInstance, container.get<Playground>(Playground), container)
          );
        return layerInstance;
      });
    if (modules) {
      modules.forEach((module) => container.load(module));
    }
    return container;
  }

  export function createPlayground(modules?: interfaces.ContainerModule[]): Playground {
    return createContainer(modules).get(Playground);
  }

  export function getLayerTestState<T extends Layer = Layer>(
    container: interfaces.Container,
    layerRegistry: LayerRegistry<T>
  ): LayerTestState<T> {
    return container
      .get<LayerStateProvider>(LayerStateProvider)
      .get(layerRegistry) as LayerTestState<T>;
  }

  /**
   * 创建layer, 并记录layer的回调数据
   * @param Layer
   * @param opts
   */
  export function createLayerTestState<T extends Layer = Layer>(
    layerRegistry: LayerRegistry<T>,
    opts?: any,
    modules?: interfaces.ContainerModule[]
  ): LayerTestState<T> {
    const container = createContainer(modules);
    const playground = container.get<Playground>(Playground);
    playground.registerLayer(layerRegistry, opts);
    playground.init();
    playground.ready();
    return getLayerTestState(container, layerRegistry);
  }
}
