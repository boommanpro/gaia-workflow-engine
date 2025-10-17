/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Emitter } from '@flowgram.ai/utils';

import type { PanelFactory, PanelConfig } from '../types';

export interface PanelElement {
  key: string;
  style?: React.CSSProperties;
  el: React.ReactNode;
}

const PANEL_SIZE_DEFAULT = 400;

export class FloatPanel {
  elements: PanelElement[] = [];

  private onUpdateEmitter = new Emitter<void>();

  sizeMap = new Map<string, number>();

  onUpdate = this.onUpdateEmitter.event;

  currentFactoryKey = '';

  updateSize(newSize: number) {
    this.sizeMap.set(this.currentFactoryKey, newSize);
    this.onUpdateEmitter.fire();
  }

  get currentSize(): number {
    return this.sizeMap.get(this.currentFactoryKey) || PANEL_SIZE_DEFAULT;
  }

  constructor(private config: PanelConfig) {}

  open(factory: PanelFactory<any>, options: any) {
    const el = factory.render(options?.props);
    const idx = this.elements.findIndex((e) => e.key === factory.key);
    this.currentFactoryKey = factory.key;
    if (!this.sizeMap.has(factory.key)) {
      this.sizeMap.set(factory.key, factory.defaultSize || PANEL_SIZE_DEFAULT);
    }
    if (idx >= 0) {
      this.elements[idx] = { el, key: factory.key, style: factory.style };
    } else {
      this.elements.push({ el, key: factory.key, style: factory.style });
      if (this.elements.length > this.config.max) {
        this.elements.shift();
      }
    }
    this.onUpdateEmitter.fire();
  }

  get visible() {
    return this.elements.length > 0;
  }

  close(key?: string) {
    if (!key) {
      this.elements = [];
    } else {
      this.elements = this.elements.filter((e) => e.key !== key);
    }
    this.onUpdateEmitter.fire();
  }

  dispose() {
    this.elements = [];
    this.onUpdateEmitter.dispose();
  }
}
