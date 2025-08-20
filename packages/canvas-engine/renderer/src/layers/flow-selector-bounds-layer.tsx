/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { inject, injectable } from 'inversify';
import { domUtils } from '@flowgram.ai/utils';
import { Rectangle } from '@flowgram.ai/utils';
import { FlowNodeEntity, FlowNodeRenderData, FlowNodeTransformData } from '@flowgram.ai/document';
import {
  CommandRegistry,
  EditorState,
  EditorStateConfigEntity,
  Layer,
  LayerOptions,
  PlaygroundConfig,
  observeEntity,
  observeEntityDatas,
} from '@flowgram.ai/core';

import { FlowRendererKey, FlowRendererRegistry } from '../flow-renderer-registry';
import { FlowSelectConfigEntity, SelectorBoxConfigEntity } from '../entities';

export interface SelectorBoxPopoverProps {
  bounds: Rectangle;
  config: PlaygroundConfig;
  flowSelectConfig: FlowSelectConfigEntity;
  commandRegistry: CommandRegistry;
  children?: React.ReactNode;
}

export interface FlowSelectorBoundsLayerOptions extends LayerOptions {
  ignoreOneSelect?: boolean;
  ignoreChildrenLength?: boolean;
  boundsPadding?: number; // 边框留白，默认 10
  disableBackground?: boolean; // 禁用背景框
  backgroundClassName?: string; // 节点下边
  foregroundClassName?: string; // 节点上边
  SelectorBoxPopover?: React.FC<SelectorBoxPopoverProps>; // 选择框工具层
  CustomBoundsRenderer?: React.FC<SelectorBoxPopoverProps>; // 自定义渲染
}

/**
 * 流程节点被框选后的边界区域渲染
 */
@injectable()
export class FlowSelectorBoundsLayer extends Layer<FlowSelectorBoundsLayerOptions> {
  @inject(FlowRendererRegistry) readonly rendererRegistry: FlowRendererRegistry;

  @inject(CommandRegistry) readonly commandRegistry: CommandRegistry;

  @observeEntity(FlowSelectConfigEntity)
  protected flowSelectConfigEntity: FlowSelectConfigEntity;

  @observeEntity(EditorStateConfigEntity)
  protected editorStateConfig: EditorStateConfigEntity;

  @observeEntity(SelectorBoxConfigEntity)
  protected selectorBoxConfigEntity: SelectorBoxConfigEntity;

  /**
   * 需要监听节点的展开和收起状态，重新绘制边框
   */
  @observeEntityDatas(FlowNodeEntity, FlowNodeRenderData)
  renderStates: FlowNodeRenderData[];

  @observeEntityDatas(FlowNodeEntity, FlowNodeTransformData)
  _transforms: FlowNodeTransformData[];

  readonly node = domUtils.createDivWithClass('gedit-selector-bounds-layer');

  readonly selectBoundsBackground = domUtils.createDivWithClass('gedit-selector-bounds-background');

  onReady(): void {
    // 这个是覆盖到节点上边的，所以要比 flow-nodes-content-layer 大
    this.node!.style.zIndex = '20';
    const { firstChild } = this.pipelineNode;
    if (this.options.boundsPadding !== undefined) {
      this.flowSelectConfigEntity.boundsPadding = this.options.boundsPadding;
    }
    if (this.options.backgroundClassName) {
      this.selectBoundsBackground.classList.add(this.options.backgroundClassName);
    }
    // 这里创建一个空 layer 用于放背景
    const selectorBoundsLayer = domUtils.createDivWithClass('gedit-playground-layer');
    selectorBoundsLayer.appendChild(this.selectBoundsBackground);
    // 背景框需要在节点的下边
    this.pipelineNode.insertBefore(selectorBoundsLayer, firstChild);
  }

  onZoom(scale: number) {
    this.node!.style.transform = `scale(${scale})`;
    this.selectBoundsBackground.parentElement!.style.transform = `scale(${scale})`;
  }

  onViewportChange() {
    // 需要调整 bounds 菜单的位置
    this.render();
  }

  isEnabled(): boolean {
    const currentState = this.editorStateConfig.getCurrentState();
    return currentState === EditorState.STATE_SELECT;
  }

  // /**
  //  * 渲染工具栏
  //  */
  // renderCommandMenus(): JSX.Element[] {
  //   return this.commandRegistry.commands
  //     .filter(cmd => cmd.category === FlowRendererCommandCategory.SELECTOR_BOX)
  //     .map(cmd => {
  //       const CommandRenderer = this.rendererRegistry.getRendererComponent(
  //         (cmd.icon as string) || cmd.id,
  //       )?.renderer;
  //
  //       return (
  //         // eslint-disable-next-line react/jsx-filename-extension
  //         <CommandRenderer
  //           key={cmd.id}
  //           disabled={!this.commandRegistry.isEnabled(cmd.id)}
  //           command={cmd}
  //           onClick={(e: any) => this.commandRegistry.executeCommand(cmd.id, e)}
  //         />
  //       );
  //     })
  //     .filter(c => c);
  // }

  render(): JSX.Element {
    const {
      ignoreOneSelect,
      ignoreChildrenLength,
      SelectorBoxPopover: SelectorBoxPopoverFromOpts,
      disableBackground,
      CustomBoundsRenderer,
    } = this.options;

    const bounds = this.flowSelectConfigEntity.getSelectedBounds();
    const selectedNodes = this.flowSelectConfigEntity.selectedNodes;

    const bg = this.selectBoundsBackground;
    const isDragging = !this.selectorBoxConfigEntity.isStart;

    if (
      bounds.width === 0 ||
      bounds.height === 0 ||
      // 选中单个的时候不显示
      (ignoreOneSelect &&
        selectedNodes.length === 1 &&
        // 选中的节点不包含多个子节点
        (ignoreChildrenLength || (selectedNodes[0] as FlowNodeEntity).childrenLength <= 1))
    ) {
      domUtils.setStyle(bg, {
        display: 'none',
      });
      return <></>;
    }
    if (CustomBoundsRenderer) {
      return (
        <CustomBoundsRenderer
          bounds={bounds}
          config={this.config}
          flowSelectConfig={this.flowSelectConfigEntity}
          commandRegistry={this.commandRegistry}
        />
      );
    }
    const style = {
      display: 'block',
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
    if (!disableBackground) {
      domUtils.setStyle(bg, style);
    }
    let foregroundClassName = 'gedit-selector-bounds-foreground';
    if (this.options.foregroundClassName) {
      foregroundClassName += ' ' + this.options.foregroundClassName;
    }
    const SelectorBoxPopover =
      SelectorBoxPopoverFromOpts ||
      this.rendererRegistry.tryToGetRendererComponent(FlowRendererKey.SELECTOR_BOX_POPOVER)
        ?.renderer;
    if (!isDragging || !SelectorBoxPopover)
      return <div className={foregroundClassName} style={style} />;
    return (
      <SelectorBoxPopover
        bounds={bounds}
        config={this.config}
        flowSelectConfig={this.flowSelectConfigEntity}
        commandRegistry={this.commandRegistry}
      >
        <div className={foregroundClassName} style={style} />
      </SelectorBoxPopover>
    );
  }
}
