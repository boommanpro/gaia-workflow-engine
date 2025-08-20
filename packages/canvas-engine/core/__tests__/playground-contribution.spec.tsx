/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { render, cleanup } from '@testing-library/react';

import {
  Playground,
  createPlaygroundContainer,
  PlaygroundReactProvider,
  PlaygroundReactRenderer,
  PlaygroundContribution,
  Layer,
  createPlaygroundPlugin,
} from '../src';

export class Layer1 extends Layer {
  renderTimes = 0;

  render = () => {
    this.renderTimes += 1;
    return <div></div>;
  };
}

export class Layer2 extends Layer {
  renderTimes = 0;

  render = () => {
    this.renderTimes += 1;
    return <div></div>;
  };
}

describe('playground-contribution', () => {
  it('contribution bind', () => {
    const container = createPlaygroundContainer();
    const lifecycle: string[] = [];
    container.bind(PlaygroundContribution).toConstantValue({
      onInit(playground: Playground) {
        playground.registerLayer(Layer1);
        playground.registerLayer(Layer2);
        playground.onAllLayersRendered(() => {
          lifecycle.push('onAllLayersRendered2');
        });
        lifecycle.push('onInit');
      },
      onReady(playground: Playground) {
        expect(playground.getLayer(Layer1)!.renderTimes).toEqual(0);
        lifecycle.push('onReady');
      },
      onAllLayersRendered(playground: Playground) {
        expect(playground.getLayer(Layer1)!.renderTimes).toEqual(1);
        expect(playground.getLayer(Layer2)!.renderTimes).toEqual(1);
        lifecycle.push('onAllLayersRendered');
      },
      onDispose(playground: Playground) {
        lifecycle.push('onDispose');
      },
    } as PlaygroundContribution);
    render(
      <PlaygroundReactProvider playgroundContainer={container}>
        <PlaygroundReactRenderer />
      </PlaygroundReactProvider>,
    );
    expect(lifecycle).toEqual(['onInit', 'onReady', 'onAllLayersRendered', 'onAllLayersRendered2']);
    cleanup();
    expect(lifecycle).toEqual([
      'onInit',
      'onReady',
      'onAllLayersRendered',
      'onAllLayersRendered2',
      'onDispose',
    ]);
  });
  it('createPlaygroundPlugin', () => {
    const container = createPlaygroundContainer();
    const lifecycle: string[] = [];
    render(
      <PlaygroundReactProvider
        playgroundContainer={container}
        plugins={() => [
          createPlaygroundPlugin({
            onInit(ctx) {
              ctx.playground.registerLayer(Layer1);
              ctx.playground.registerLayer(Layer2);
              lifecycle.push('onInit');
            },
            onReady(ctx) {
              expect(ctx.playground.getLayer(Layer1)!.renderTimes).toEqual(0);
              lifecycle.push('onReady');
            },
            onAllLayersRendered(ctx) {
              expect(ctx.playground.getLayer(Layer1)!.renderTimes).toEqual(1);
              expect(ctx.playground.getLayer(Layer2)!.renderTimes).toEqual(1);
              lifecycle.push('onAllLayersRendered');
            },
            onDispose() {
              lifecycle.push('onDispose');
            },
          }),
        ]}
      >
        <PlaygroundReactRenderer />
      </PlaygroundReactProvider>,
    );
    expect(lifecycle).toEqual(['onInit', 'onReady', 'onAllLayersRendered']);
    cleanup();
    expect(lifecycle).toEqual(['onInit', 'onReady', 'onAllLayersRendered', 'onDispose']);
  });
});
