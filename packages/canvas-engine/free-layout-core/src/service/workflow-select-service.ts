/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import {
  type Entity,
  Playground,
  SelectionService,
  TransformData,
  type PlaygroundConfigRevealOpts,
} from '@flowgram.ai/core';
import { type Event, Rectangle, SizeSchema } from '@flowgram.ai/utils';

import { delay } from '../utils';
import { WorkflowNodeEntity } from '../entities';
import { type WorkfloEntityHoverable } from './workflow-hover-service';

@injectable()
export class WorkflowSelectService {
  @inject(SelectionService) protected selectionService: SelectionService;

  @inject(Playground) protected playground: Playground;

  get onSelectionChanged(): Event<void> {
    return this.selectionService.onSelectionChanged;
  }

  get selection(): Entity[] {
    return this.selectionService.selection;
  }

  set selection(entities: Entity[]) {
    this.selectionService.selection = entities;
  }

  /**
   * 当前激活的节点只能有一个
   */
  get activatedNode(): WorkflowNodeEntity | undefined {
    const { selectedNodes } = this;
    if (selectedNodes.length !== 1) {
      return undefined;
    }
    return selectedNodes[0];
  }

  isSelected(id: string): boolean {
    return this.selectionService.selection.some(s => s.id === id);
  }

  isActivated(id: string): boolean {
    return this.activatedNode?.id === id;
  }

  /**
   * 选中的节点
   */
  get selectedNodes(): WorkflowNodeEntity[] {
    return this.selectionService.selection.filter(
      n => n instanceof WorkflowNodeEntity,
    ) as WorkflowNodeEntity[];
  }

  /**
   * 选中
   * @param node
   */
  selectNode(node: WorkflowNodeEntity): void {
    this.selectionService.selection = [node];
  }

  toggleSelect(node: WorkflowNodeEntity): void {
    if (this.selectionService.selection.includes(node)) {
      this.selectionService.selection = this.selectionService.selection.filter(n => n !== node);
    } else {
      this.selectionService.selection = this.selectionService.selection.concat(node);
    }
  }

  select(node: WorkfloEntityHoverable): void {
    this.selectionService.selection = [node];
  }

  clear(): void {
    this.selectionService.selection = [];
  }

  /**
   *  选中并滚动到节点
   * @param node
   */
  async selectNodeAndScrollToView(node: WorkflowNodeEntity, fitView?: boolean): Promise<void> {
    this.selectNodeAndFocus(node);
    const DELAY_TIME = 30;
    // 等待节点渲染完成(一般用于刚添加的节点)
    await delay(DELAY_TIME);

    const scrollConfig: PlaygroundConfigRevealOpts = {
      entities: [node],
    };

    if (fitView) {
      const bounds = Rectangle.enlarge([node.getData<TransformData>(TransformData).bounds]).pad(
        30,
        30,
      ); // 留出 30 像素的边界

      const viewport = this.playground.config.getViewport(false);

      const zoom = SizeSchema.fixSize(bounds, viewport);

      scrollConfig.zoom = zoom;
      scrollConfig.scrollToCenter = true;
      scrollConfig.easing = true;
    }

    return this.playground.config.scrollToView(scrollConfig);
  }

  selectNodeAndFocus(node: WorkflowNodeEntity): void {
    // 新添加的节点需要被选中
    this.select(node);
    // 拖进来需要让画布聚焦, 才能使用快捷键删除
    this.playground.node.focus();
  }
}
