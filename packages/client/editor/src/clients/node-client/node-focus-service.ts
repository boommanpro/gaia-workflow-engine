/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';
import { type FormItem } from '@flowgram.ai/form-core';
import { Playground, PlaygroundConfigRevealOpts } from '@flowgram.ai/core';

import { highlightFormItem, HighLightOptions } from './highlight';

export type FocusNodeCanvasOptions = PlaygroundConfigRevealOpts;

export interface FocusNodeFormItemOptions {
  canvas?: FocusNodeCanvasOptions;
  highlight?: boolean | HighLightOptions;
}

@injectable()
export class NodeFocusService {
  @inject(Playground) readonly playground: Playground;

  protected previousOverlay: HTMLDivElement | undefined;

  protected currentPromise: Promise<void> | undefined;

  highlightNodeFormItem(formItem: FormItem, options?: HighLightOptions) {
    this.previousOverlay = highlightFormItem(formItem, options);
  }

  focusNodeFormItem(formItem: FormItem, options?: FocusNodeFormItemOptions): Promise<void> {
    const node = formItem.formModel.flowNodeEntity;
    const { canvas = {}, highlight } = options || {};
    if (this.previousOverlay) {
      this.previousOverlay.remove();
      this.previousOverlay = undefined;
    }
    const currentPromise = this.playground
      .scrollToView({ entities: [node], scrollToCenter: true, ...canvas })
      .then(() => {
        if (!formItem || !highlight || this.currentPromise !== currentPromise) {
          return;
        }
        this.highlightNodeFormItem(formItem, typeof highlight === 'boolean' ? {} : highlight);
      });
    this.currentPromise = currentPromise;
    return this.currentPromise;
  }
}
