/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/no-deprecated */
import React from 'react';

import { inject } from 'inversify';
import { domUtils } from '@flowgram.ai/utils';
import { nanoid } from '@flowgram.ai/free-layout-core';
import { Layer } from '@flowgram.ai/core';

import type {
  CallNodePanelParams,
  NodePanelLayerOptions,
  NodePanelRenderProps,
  NodePanelResult,
} from './type';
import { WorkflowNodePanelService } from './service';

export class WorkflowNodePanelLayer extends Layer<NodePanelLayerOptions> {
  public static type = 'WorkflowNodePanelLayer';

  @inject(WorkflowNodePanelService) private service: WorkflowNodePanelService;

  public node: HTMLDivElement;

  private renderList: Map<string, NodePanelRenderProps>;

  constructor() {
    super();
    this.node = domUtils.createDivWithClass('gedit-playground-layer gedit-node-panel-layer');
    this.node.style.zIndex = '9999';
    this.renderList = new Map();
  }

  public onReady(): void {
    this.service.setCallNodePanel(this.call.bind(this));
  }

  public onZoom(zoom: number): void {
    this.node.style.transform = `scale(${zoom})`;
  }

  public render(): JSX.Element {
    const NodePanelRender = this.options.renderer;
    return (
      <>
        {Array.from(this.renderList.keys()).map((taskId) => {
          const renderProps = this.renderList.get(taskId)!;
          return <NodePanelRender key={taskId} {...renderProps} />;
        })}
      </>
    );
  }

  private async call(params: CallNodePanelParams): Promise<void> {
    const taskId = nanoid();
    const { onSelect, onClose, enableMultiAdd = false, panelProps = {} } = params;
    return new Promise((resolve) => {
      const unmount = () => {
        // 清理挂载的组件
        this.renderList.delete(taskId);
        this.render();
        resolve();
      };
      const handleClose = () => {
        unmount();
        onClose();
      };
      const handleSelect = (params?: NodePanelResult) => {
        onSelect(params);
        if (!enableMultiAdd) {
          unmount();
        }
      };
      const renderProps: NodePanelRenderProps = {
        ...params,
        panelProps,
        onSelect: handleSelect,
        onClose: handleClose,
      };
      this.renderList.set(taskId, renderProps);
      this.render();
    });
  }
}
