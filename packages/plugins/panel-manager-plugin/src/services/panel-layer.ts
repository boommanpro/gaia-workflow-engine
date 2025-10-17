/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from 'react-dom';
import { createElement } from 'react';

import { injectable, inject } from 'inversify';
import { domUtils, Disposable } from '@flowgram.ai/utils';
import { Layer, PluginContext } from '@flowgram.ai/core';

import { PanelLayer as PanelLayerComp } from '../components/panel-layer';
import { PanelManagerConfig } from './panel-config';

@injectable()
export class PanelLayer extends Layer {
  @inject(PanelManagerConfig) private readonly panelConfig: PanelManagerConfig;

  @inject(PluginContext) private readonly pluginContext: PluginContext;

  readonly panelRoot = domUtils.createDivWithClass('gedit-flow-panel-layer');

  layout: JSX.Element | null = null;

  onReady(): void {
    this.panelConfig.getPopupContainer(this.pluginContext).appendChild(this.panelRoot);
    this.toDispose.push(
      Disposable.create(() => {
        // Remove from PopupContainer
        this.panelRoot.remove();
      })
    );
    const commonStyle = {
      pointerEvents: 'none',
      width: '100%',
      height: '100%',
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 100,
    };
    domUtils.setStyle(this.panelRoot, commonStyle);
  }

  render(): JSX.Element {
    if (!this.layout) {
      this.layout = createElement(PanelLayerComp);
    }
    return ReactDOM.createPortal(this.layout, this.panelRoot);
  }
}
