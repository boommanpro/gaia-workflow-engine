/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces, ContainerModule } from 'inversify';

import {
  createPlaygroundPlugin,
  definePluginCreator,
  Playground,
  createPlaygroundContainer,
  PluginContext,
  loadPlugins,
  createPluginContextDefault,
} from '../src';

describe('playground plugin', () => {
  let container: interfaces.Container;
  let playground: Playground;
  let getPluginContext = () => container.get<PluginContext>(PluginContext);
  beforeEach(() => {
    container = createPlaygroundContainer();
    playground = container.get<Playground>(Playground);
  });
  it('createPlaygroundPlugin', () => {
    const customModel1 = {};
    let isInit = false;
    let isReady = false;
    let isDispose = false;
    const customPlugin = createPlaygroundPlugin({
      onBind({ bind }) {
        bind('customModel1').toConstantValue(customModel1);
      },
      onInit(ctx) {
        expect(ctx).toEqual(container.get(PluginContext));
        isInit = true;
      },
      onReady(ctx) {
        expect(ctx).toEqual(container.get(PluginContext));
        isReady = true;
      },
      onDispose(ctx) {
        expect(ctx).toEqual(container.get(PluginContext));
        isDispose = true;
      },
    });
    loadPlugins([customPlugin], container);
    // check plugin context
    expect(getPluginContext().playground).toEqual(playground);
    expect(getPluginContext().get('customModel1')).toEqual(customModel1);
    expect(getPluginContext().getAll('customModel1')).toEqual([customModel1]);
    playground.init();
    expect(isInit).toEqual(true);
    expect(isReady).toEqual(false);
    playground.ready();
    expect(isReady).toEqual(true);
    expect(isDispose).toEqual(false);
    playground.dispose();
    expect(isDispose).toEqual(true);
  });
  it('custom container modules', () => {
    const customModel2 = {};
    const customContainerModules = new ContainerModule((bind) =>
      bind('customModel2').toConstantValue(customModel2)
    );
    const customPlugin = createPlaygroundPlugin({
      containerModules: [customContainerModules],
    });
    loadPlugins([customPlugin], container);
    expect(getPluginContext().get('customModel2')).toEqual(customModel2);
  });
  it('definePluginCreator', () => {
    const someOpts = { isOpts1: true };
    const someOpts2 = { isOpts2: true };

    let times = 0;
    const createMinePlugin = definePluginCreator<any>({
      onInit(ctx, opts) {
        expect(ctx).toEqual(container.get(PluginContext));
        expect(opts).toEqual(someOpts);
        times++;
      },
      onReady(ctx, opts) {
        expect(ctx).toEqual(container.get(PluginContext));
        expect(opts).toEqual(someOpts);
        times++;
      },
      onDispose(ctx, opts) {
        expect(ctx).toEqual(container.get(PluginContext));
        expect(opts).toEqual(someOpts);
        times++;
      },
    });
    loadPlugins([createMinePlugin(someOpts), createMinePlugin(someOpts2)], container);
    playground.init();
    playground.ready();
    playground.dispose();
    expect(times).toEqual(3);
  });
  it('definePluginCreator with contribution', () => {
    const contributionKey1 = Symbol('contributionKey');
    const contributionKey2 = Symbol('contributionKey2');
    const createMinePlugin = definePluginCreator({
      contributionKeys: [contributionKey1, contributionKey2],
    });
    loadPlugins(
      [createMinePlugin({ contrib1: true }), createMinePlugin({ contrib2: true })],
      container
    );
    expect(getPluginContext().getAll(contributionKey1)).toEqual([
      { contrib1: true },
      { contrib2: true },
    ]);
    expect(getPluginContext().getAll(contributionKey2)).toEqual([
      { contrib1: true },
      { contrib2: true },
    ]);
  });
  it('load simple plugin', () => {
    const allOpts: any[] = [];
    const createMinePlugin = definePluginCreator<any>({
      onInit(ctx, opts) {
        allOpts.push(opts);
      },
    });
    loadPlugins([createMinePlugin({ v: 1 }), createMinePlugin({ v: 2 })], container);
    playground.init();
    // 只加载第一个
    expect(allOpts).toEqual([{ v: 1 }]);
  });
  it('load simple plugin from different playground', () => {
    const allOpts: any[] = [];
    const container1 = createPlaygroundContainer();
    const playground1 = container1.get<Playground>(Playground);
    const container2 = createPlaygroundContainer();
    const playground2 = container2.get<Playground>(Playground);
    const createMinePlugin = definePluginCreator<any>({
      onInit(ctx, opts) {
        allOpts.push(opts);
      },
    });
    loadPlugins([createMinePlugin({ v: 1 }), createMinePlugin({ v: 2 })], container1);
    playground1.init();
    loadPlugins([createMinePlugin({ v: 3 }), createMinePlugin({ v: 4 })], container2);
    playground2.init();
    // 两个画布使用插件不互相干扰
    expect(allOpts).toEqual([{ v: 1 }, { v: 3 }]);
  });
  it('rebind plugin context', () => {
    container
      .rebind(PluginContext)
      .toDynamicValue((ctx) => ({
        ...createPluginContextDefault(ctx.container),
        document: { isDocument: true },
      }))
      .inSingletonScope();
    let isInit = false;
    const customPlugin = createPlaygroundPlugin<any>({
      onInit(ctx) {
        expect(ctx).toEqual(container.get(PluginContext));
        expect(ctx.document.isDocument).toEqual(true);
        isInit = true;
      },
    });
    loadPlugins([customPlugin], container);
    playground.init();
    expect(isInit).toEqual(true);
  });
});
