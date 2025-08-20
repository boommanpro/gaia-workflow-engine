/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';

import { injectByProvider } from '../core/utils';

/**
 * 会被注入到 layer 层，可以在使用的时候替换它
 */
export const PlaygroundContext = Symbol('PlaygroundContext');

export type PlaygroundContext = any;

export const PlaygroundContextProvider = Symbol('PlaygroundContextProvider');
export type PlaygroundContextProvider = () => any;
export const injectPlaygroundContext = () => injectByProvider(PlaygroundContextProvider);
export const bindPlaygroundContextProvider = (bind: interfaces.Bind) => {
  bind(PlaygroundContextProvider).toDynamicValue(ctx => () => {
    if (ctx.container.isBound(PlaygroundContext)) {
      return ctx.container.get(PlaygroundContext);
    }
    return undefined;
  });
};

export const PlaygroundContainerFactory = Symbol('PlaygroundContainerFactory');

export interface PlaygroundContainerFactory {
  createChild: interfaces.Container['createChild'];
  get: interfaces.Container['get'];
  getAll: interfaces.Container['getAll'];
}
