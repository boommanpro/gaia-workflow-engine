/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ICache } from '@flowgram.ai/runtime-interface';

export class WorkflowRuntimeCache implements ICache {
  private map: Map<string, any>;

  public init(): void {
    this.map = new Map();
  }

  public dispose(): void {
    this.map.clear();
  }

  public get(key: string): any {
    return this.map.get(key);
  }

  public set(key: string, value: any): this {
    this.map.set(key, value);
    return this;
  }

  public delete(key: string): boolean {
    return this.map.delete(key);
  }

  public has(key: string): boolean {
    return this.map.has(key);
  }
}
