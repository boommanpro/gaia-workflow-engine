/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, interfaces, optional } from 'inversify';
import 'reflect-metadata';

export const injectByProvider = (provider: interfaces.ServiceIdentifier) =>
  function (target: any, propertyKey: string) {
    const providerPropertyKey = `${propertyKey}Provider`;

    inject(provider)(target, providerPropertyKey);
    optional()(target, providerPropertyKey);

    // decorate 会依赖 reflect-metadata，因此解除其依赖
    // decorate(inject(provider), target, providerPropertyKey);
    // decorate(optional(), target, providerPropertyKey);

    return {
      get() {
        return this[providerPropertyKey]?.();
      },
      configurable: true,
      enumerable: true,
    } as any;
  };
