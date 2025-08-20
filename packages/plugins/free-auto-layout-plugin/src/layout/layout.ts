/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { LayoutConfig, LayoutOptions, LayoutParams } from './type';
import { LayoutStore } from './store';
import { LayoutPosition } from './position';
import { DagreLayout } from './dagre';

export class Layout {
  private readonly _store: LayoutStore;

  private readonly _layout: DagreLayout;

  private readonly _position: LayoutPosition;

  constructor(config: LayoutConfig) {
    this._store = new LayoutStore(config);
    this._layout = new DagreLayout(this._store);
    this._position = new LayoutPosition(this._store);
  }

  public init(params: LayoutParams, options: LayoutOptions): void {
    this._store.create(params, options);
  }

  public layout(): void {
    if (!this._store.initialized) {
      return;
    }
    this._layout.layout();
  }

  public async position(): Promise<void> {
    if (!this._store.initialized) {
      return;
    }
    return await this._position.position();
  }
}
