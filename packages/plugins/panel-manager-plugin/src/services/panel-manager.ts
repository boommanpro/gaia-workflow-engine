/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';

import { PanelManagerConfig } from './panel-config';
import type { Area, PanelFactory } from '../types';
import { FloatPanel } from './float-panel';

@injectable()
export class PanelManager {
  @inject(PanelManagerConfig) readonly config: PanelManagerConfig;

  readonly panelRegistry = new Map<string, PanelFactory<any>>();

  right: FloatPanel;

  bottom: FloatPanel;

  init() {
    this.config.factories.forEach((factory) => this.register(factory));
    this.right = new FloatPanel(this.config.right);
    this.bottom = new FloatPanel(this.config.bottom);
  }

  register<T extends any>(factory: PanelFactory<T>) {
    this.panelRegistry.set(factory.key, factory);
  }

  open(key: string, area: Area = 'right', options?: any) {
    const factory = this.panelRegistry.get(key);
    if (!factory) {
      return;
    }
    const panel = this.getPanel(area);
    panel.open(factory, options);
  }

  close(key?: string) {
    this.right.close(key);
    this.bottom.close(key);
  }

  getPanel(area: Area) {
    return area === 'right' ? this.right : this.bottom;
  }

  dispose() {
    this.right.dispose();
    this.bottom.dispose();
  }
}
