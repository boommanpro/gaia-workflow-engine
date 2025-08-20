/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { domUtils, PositionSchema } from '@flowgram.ai/utils';
import { FlowDocument, FlowNodeEntity, FlowNodeTransformData } from '@flowgram.ai/document';
import {
  ContextMenuService,
  EditorState,
  EditorStateConfigEntity,
  Layer,
  LayerOptions,
  observeEntity,
  PipelineLayerPriority,
  PlaygroundConfigEntity,
  PlaygroundDrag,
  SelectionService,
} from '@flowgram.ai/core';

import { FlowSelectConfigEntity, SelectorBoxConfigEntity } from '../entities';

export interface FlowSelectorBoxOptions extends LayerOptions {
  /**
   * 默认不提供则为点击空白地方可以框选
   * @param e
   * @param entity
   */
  canSelect?: (e: MouseEvent, entity: SelectorBoxConfigEntity) => boolean;
}
/**
 * 流程选择框
 */
@injectable()
export class FlowSelectorBoxLayer extends Layer<FlowSelectorBoxOptions> {
  @inject(FlowDocument)
  protected flowDocument: FlowDocument;

  @inject(ContextMenuService)
  readonly contextMenuService: ContextMenuService;

  @observeEntity(PlaygroundConfigEntity)
  protected playgroundConfigEntity: PlaygroundConfigEntity;

  @inject(SelectionService) readonly selectionService: SelectionService;

  @observeEntity(SelectorBoxConfigEntity)
  protected selectorBoxConfigEntity: SelectorBoxConfigEntity;

  @observeEntity(FlowSelectConfigEntity)
  protected selectConfigEntity: FlowSelectConfigEntity;

  @observeEntity(EditorStateConfigEntity)
  protected editorStateConfig: EditorStateConfigEntity;

  readonly node = domUtils.createDivWithClass('gedit-selector-box-layer');

  /**
   * 选择框
   */
  protected selectorBox = this.createDOMCache('gedit-selector-box');

  /**
   * 用于遮挡鼠标，避免触发 hover
   */
  protected selectorBoxBlock = this.createDOMCache('gedit-selector-box-block');

  protected transformVisibles: FlowNodeTransformData[];

  /**
   * 拖动选择框
   */
  protected selectboxDragger = new PlaygroundDrag({
    onDragStart: (e) => {
      this.selectConfigEntity.clearSelectedNodes();
      const mousePos = this.playgroundConfigEntity.getPosFromMouseEvent(e);
      this.transformVisibles = this.flowDocument
        .getRenderDatas(FlowNodeTransformData, false)
        .filter((transform) => {
          const { entity } = transform;
          if (entity.originParent) {
            return (
              this.nodeSelectable(entity, mousePos) &&
              this.nodeSelectable(entity.originParent, mousePos)
            );
          }
          return this.nodeSelectable(entity, mousePos);
        });
      this.selectorBoxConfigEntity.setDragInfo(e);
      this.updateSelectorBox(this.selectorBoxConfigEntity);
    },
    onDrag: (e) => {
      this.selectorBoxConfigEntity.setDragInfo(e);
      // 更新选择框
      this.selectConfigEntity.selectFromBounds(
        this.selectorBoxConfigEntity.toRectangle(this.playgroundConfigEntity.finalScale),
        this.transformVisibles
      );
      this.updateSelectorBox(this.selectorBoxConfigEntity);
    },
    onDragEnd: (e) => {
      this.selectorBoxConfigEntity.setDragInfo(e);
      this.transformVisibles.length = 0;
      this.updateSelectorBox(this.selectorBoxConfigEntity);
    },
  });

  onReady(): void {
    if (!this.options.canSelect) {
      this.options.canSelect = (e: MouseEvent) => {
        const target = e.target as HTMLElement | undefined;
        // 默认点击空白地方可以框选
        return target === this.pipelineNode || target === this.playgroundNode;
      };
    }
    // 将选中的节点同步到全局
    // TODO 后续要统一到 selection service
    this.toDispose.pushAll([
      this.selectConfigEntity.onConfigChanged(() => {
        this.selectionService.selection = this.selectConfigEntity.selectedNodes;
      }),
      this.selectionService.onSelectionChanged(() => {
        const selectedNodes = this.selectionService.selection.filter(
          (entity) => entity instanceof FlowNodeEntity
        );

        this.selectConfigEntity.selectedNodes = selectedNodes as FlowNodeEntity[];
      }),
    ]);
    this.listenPlaygroundEvent(
      'mousedown',
      (e: MouseEvent): boolean | undefined => {
        if (!this.isEnabled()) return;
        // 自定义拦截选择框事件
        if (this.options.canSelect && !this.options.canSelect(e, this.selectorBoxConfigEntity)) {
          return;
        }

        const currentState = this.editorStateConfig.getCurrentState();

        // 鼠标友好模式，框选后，再次点击其他地方或者框选其他地方，需要清空已有选择的节点
        if (currentState === EditorState.STATE_MOUSE_FRIENDLY_SELECT) {
          this.selectConfigEntity.clearSelectedNodes();
        }

        // const target = e.target as HTMLElement | undefined;
        // TODO 下边这些特化逻辑迁移到固定布局逻辑
        // const linesLayer = document.querySelector('.gedit-flow-lines-layer');
        // const toolsTarget = document.querySelector('.flow-canvas-selector-box-tools');
        // const isInTools = toolsTarget && (toolsTarget === target || toolsTarget.contains(target!));
        // 保证 service 更新后进行是否清除的计算
        // setTimeout(() => {
        //   // 如果点击到选中区域的菜单栏
        //   if (!isInTools && !this.contextMenuService.rightPanelVisible) {
        //     // 取消之前的选择状态
        //     this.selectConfigEntity.clearSelectedNodes();
        //   }
        // }, 0);
        // if (
        //   target === this.pipelineNode ||
        //   target === this.playgroundNode // 点击空白区域
        //   linesLayer?.contains(target!) // 点击 svg 线条
        //   target?.classList.contains('flow-canvas-adder') || // 点击添加按钮的留白区域
        //   target?.classList.contains('flow-canvas-block-icon') // 点击添加按钮的留白区域
        // ) {
        //   return true;
        // }
        this.selectboxDragger.start(e.clientX, e.clientY, this.config);
        return true;
      },
      PipelineLayerPriority.BASE_LAYER
    );
  }

  isEnabled(): boolean {
    const currentState = this.editorStateConfig.getCurrentState();
    const isMouseFriendly = currentState === EditorState.STATE_MOUSE_FRIENDLY_SELECT;

    return (
      !this.config.disabled &&
      !this.config.readonly &&
      // 鼠标友好模式下，需要按下 shift 启动框选
      ((isMouseFriendly && this.editorStateConfig.isPressingShift) ||
        currentState === EditorState.STATE_SELECT) &&
      !this.selectorBoxConfigEntity.disabled
    );
  }

  /**
   * Destroy
   */
  dispose(): void {
    this.selectorBox.dispose();
    this.selectorBoxBlock.dispose();
    super.dispose();
  }

  protected updateSelectorBox(selector: SelectorBoxConfigEntity): void {
    const node = this.selectorBox.get();
    const block = this.selectorBoxBlock.get();
    // 非可用状态且在 moving 则关闭选择框
    if (!this.isEnabled() && selector.isMoving) {
      this.selectorBoxConfigEntity.collapse();
    }
    if (!this.isEnabled() || !selector.isMoving) {
      node.setStyle({
        display: 'none',
      });
      block.setStyle({
        display: 'none',
      });
    } else {
      node.setStyle({
        display: 'block',
        left: selector.position.x,
        top: selector.position.y,
        width: selector.size.width,
        height: selector.size.height,
      });
      // 这是遮挡滑块，防止触发节点 hover
      block.setStyle({
        display: 'block',
        left: selector.position.x - 10,
        top: selector.position.y - 10,
        width: selector.size.width + 20,
        height: selector.size.height + 20,
      });
    }
  }

  private nodeSelectable(node: FlowNodeEntity, mousePos: PositionSchema) {
    const selectable = node.getNodeMeta().selectable;
    if (typeof selectable === 'function') {
      return selectable(node, mousePos);
    } else {
      return selectable;
    }
  }

  // autorun(): void {
  //   this.updateSelectorBox(this.selectorBoxConfigEntity);
  // }
}
