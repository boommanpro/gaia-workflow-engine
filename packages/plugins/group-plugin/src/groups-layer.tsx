/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { inject, injectable } from 'inversify';
import { FlowRendererRegistry } from '@flowgram.ai/renderer';
import {
  FlowDocument,
  FlowDocumentTransformerEntity,
  FlowGroupController,
  FlowGroupService,
  FlowNodeEntity,
  FlowNodeRenderData,
  FlowNodeTransformData,
} from '@flowgram.ai/document';
import { Layer, observeEntity, observeEntityDatas } from '@flowgram.ai/core';
import { domUtils } from '@flowgram.ai/utils';

import { GroupsLayerOptions, IGroupBox } from './type';
import { GroupRenderer } from './constant';
import { GroupBox } from './components';

@injectable()
export class GroupsLayer extends Layer<GroupsLayerOptions> {
  public readonly node: HTMLElement;

  @inject(FlowDocument) protected document: FlowDocument;

  @inject(FlowRendererRegistry)
  protected readonly rendererRegistry: FlowRendererRegistry;

  @inject(FlowGroupService)
  protected readonly groupService: FlowGroupService;

  @observeEntity(FlowDocumentTransformerEntity)
  readonly documentTransformer: FlowDocumentTransformerEntity;

  @observeEntityDatas(FlowNodeEntity, FlowNodeRenderData)
  renderStates: FlowNodeRenderData[];

  @observeEntityDatas(FlowNodeEntity, FlowNodeTransformData)
  transforms: FlowNodeTransformData[];

  private readonly className = 'gedit-groups-layer';

  constructor() {
    super();
    this.node = domUtils.createDivWithClass(this.className);
    this.node.style.zIndex = '0';
  }

  /** 缩放 */
  public onZoom(scale: number): void {
    this.node!.style.transform = `scale(${scale})`;
  }

  public render(): JSX.Element {
    if (this.documentTransformer.loading) return <></>;
    this.documentTransformer.refresh();

    return <>{this.renderGroups()}</>;
  }

  /** 渲染分组 */
  protected renderGroups(): JSX.Element {
    const Box = this.renderer || GroupBox;
    return (
      <>
        {this.groups.map(group => (
          <Box
            key={group.groupNode.id}
            groupNode={group.groupNode}
            backgroundStyle={this.options.groupBoxStyle}
          />
        ))}
      </>
    );
  }

  /** 所有分组 */
  protected get groups(): FlowGroupController[] {
    return this.groupService.getAllGroups();
  }

  protected get renderer(): IGroupBox {
    return this.rendererRegistry.tryToGetRendererComponent(GroupRenderer.GroupBox)
      ?.renderer as IGroupBox;
  }
}
