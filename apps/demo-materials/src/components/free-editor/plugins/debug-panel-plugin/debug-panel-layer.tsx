/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { domUtils, injectable, Layer } from '@flowgram.ai/free-layout-editor';

import { DebugPanel } from './components/debug-panel';

@injectable()
export class DebugPanelLayer extends Layer {
  onReady(): void {
    // Fix panel in the right of canvas
    this.config.onDataChange(() => {
      const { scrollX, scrollY } = this.config.config;
      domUtils.setStyle(this.node, {
        position: 'absolute',
        right: 25 - scrollX,
        top: scrollY + 25,
        zIndex: 999,
      });
    });
  }

  render(): JSX.Element {
    return <DebugPanel />;
  }
}
