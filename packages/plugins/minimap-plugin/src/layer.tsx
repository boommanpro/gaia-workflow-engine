/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { inject, injectable } from 'inversify';
import { domUtils } from '@flowgram.ai/utils';
import {
  FlowNodeEntity,
  FlowNodeTransformData,
  FlowDocumentTransformerEntity,
} from '@flowgram.ai/document';
import {
  Layer,
  observeEntityDatas,
  observeEntity,
  PlaygroundConfigEntity,
} from '@flowgram.ai/core';

import { MinimapLayerOptions } from './type';
import { FlowMinimapService } from './service';
import { MinimapRender } from './component';

@injectable()
export class FlowMinimapLayer extends Layer<MinimapLayerOptions> {
  public static type = 'FlowMinimapLayer';

  @inject(FlowMinimapService) private readonly service: FlowMinimapService;

  @observeEntityDatas(FlowNodeEntity, FlowNodeTransformData)
  transformDatas: FlowNodeTransformData[];

  @observeEntity(PlaygroundConfigEntity) configEntity: PlaygroundConfigEntity;

  @observeEntity(FlowDocumentTransformerEntity)
  readonly documentTransformer: FlowDocumentTransformerEntity;

  public readonly node: HTMLElement;

  private readonly className = 'gedit-minimap-layer gedit-playground-layer';

  constructor() {
    super();
    this.node = domUtils.createDivWithClass(this.className);
    this.node.style.zIndex = '9999';
  }

  public render(): JSX.Element {
    if (this.documentTransformer.loading) return <></>;
    this.documentTransformer.refresh();
    this.service.render();
    if (this.options.disableLayer) {
      return <></>;
    }
    return (
      <MinimapRender
        service={this.service}
        panelStyles={this.options.panelStyles}
        containerStyles={this.options.containerStyles}
        inactiveStyle={this.options.inactiveStyle}
      />
    );
  }
}
