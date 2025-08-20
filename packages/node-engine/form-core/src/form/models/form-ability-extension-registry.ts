/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';

export interface Extension {
  key: string;
}
@injectable()
export class FormAbilityExtensionRegistry {
  protected registry = new Map<string, Extension>();

  register(extension: Extension): void {
    this.registry.set(extension.key, extension);
  }

  get<T extends Extension>(key: string): T | undefined {
    return this.registry.get(key) as T | undefined;
  }

  get objectMap(): Record<string, Extension> {
    return Object.fromEntries(this.registry);
  }

  get collection(): Extension[] {
    return Array.from(this.registry.values());
  }
}
