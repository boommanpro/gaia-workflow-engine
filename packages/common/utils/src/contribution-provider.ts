/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type interfaces } from 'inversify';

export const ContributionProvider = Symbol('ContributionProvider');

export interface ContributionProvider<T extends object> {
  getContributions(): T[];

  forEach(fn: (v: T) => void): void;
}

class ContainerContributionProviderImpl<T extends object> implements ContributionProvider<T> {
  protected services: T[] | undefined;

  constructor(
    protected readonly container: interfaces.Container,
    protected readonly identifier: interfaces.ServiceIdentifier<T>
  ) {}

  forEach(fn: (v: T) => void): void {
    this.getContributions().forEach(fn);
  }

  getContributions(): T[] {
    if (!this.services) {
      const currentServices: T[] = [];
      let { container } = this;
      if (container.isBound(this.identifier)) {
        try {
          currentServices.push(...container.getAll(this.identifier));
        } catch (error: any) {
          console.error(error);
        }
      }

      this.services = currentServices;
    }
    return this.services;
  }
}

export function bindContributionProvider(bind: interfaces.Bind, id: symbol): void {
  bind(ContributionProvider)
    .toDynamicValue((ctx) => new ContainerContributionProviderImpl(ctx.container, id))
    .inSingletonScope()
    .whenTargetNamed(id);
}
