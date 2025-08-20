/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { FlowDocument, FlowNodeTransformData } from '@flowgram.ai/document';
import { Layer } from '@flowgram.ai/core';
import { ScrollSchema } from '@flowgram.ai/utils';

import { scrollLimit } from '../utils';

/**
 * 控制滚动边界
 */
@injectable()
export class FlowScrollLimitLayer extends Layer {
  @inject(FlowDocument) readonly document: FlowDocument;

  getInitScroll(): ScrollSchema {
    return this.document.layout.getInitScroll(this.pipelineNode.getBoundingClientRect());
  }

  onReady(): void {
    const initScroll = () => this.getInitScroll();
    this.config.updateConfig(initScroll());
    this.config.addScrollLimit(scroll =>
      scrollLimit(
        scroll,
        [this.document.root.getData(FlowNodeTransformData)!.bounds],
        this.config,
        initScroll,
      ),
    );
  }
}
