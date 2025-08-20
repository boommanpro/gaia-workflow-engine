/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, interfaces } from 'inversify';

export const LazyInjectContext = Symbol('LazyInjectContext');
export const IS_LAZY_INJECT_CONTEXT_INJECTED = Symbol('IS_LAZY_INJECT_CONTEXT_INJECTED');

export const lazyInject = (serviceIdentifier: interfaces.ServiceIdentifier) =>
  function (target: any, propertyKey: string) {
    if (!serviceIdentifier) {
      throw new Error(
        `ServiceIdentifier ${serviceIdentifier} in @lazyInject is Empty, it might be caused by file circular dependency, please check it.`,
      );
    }

    // 只依赖注入一次
    if (!Reflect.hasMetadata(IS_LAZY_INJECT_CONTEXT_INJECTED, target)) {
      inject(LazyInjectContext)(target, LazyInjectContext);
      Reflect.defineMetadata(IS_LAZY_INJECT_CONTEXT_INJECTED, true, target);
    }

    const descriptor = {
      get() {
        const ctx = this[LazyInjectContext];
        return ctx.get(serviceIdentifier);
      },
      set() {},
      configurable: true,
      enumerable: true,
    } as any;

    // Object.defineProperty(target, propertyKey, descriptor);

    return descriptor;
  };
