/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { DisposableCollection } from '@flowgram.ai/utils';
import type { PositionSchema } from '@flowgram.ai/utils';
import {
  WorkflowDocument,
  WorkflowDragService,
  WorkflowLinesManager,
  WorkflowNodeEntity,
} from '@flowgram.ai/free-layout-core';
import { WorkflowSelectService } from '@flowgram.ai/free-layout-core';
import { WorkflowNodeJSON } from '@flowgram.ai/free-layout-core';
import { HistoryService } from '@flowgram.ai/free-history-plugin';
import { PlaygroundConfigEntity } from '@flowgram.ai/core';

import { WorkflowNodePanelUtils } from './utils';
import type {
  CallNodePanel,
  CallNodePanelParams,
  NodePanelCallParams,
  NodePanelResult,
} from './type';

/**
 * 添加节点面板服务
 */
@injectable()
export class WorkflowNodePanelService {
  @inject(WorkflowDocument) private readonly document: WorkflowDocument;

  @inject(WorkflowDragService)
  private readonly dragService: WorkflowDragService;

  @inject(WorkflowSelectService)
  private readonly selectService: WorkflowSelectService;

  @inject(WorkflowLinesManager)
  private readonly linesManager: WorkflowLinesManager;

  @inject(PlaygroundConfigEntity)
  private readonly playgroundConfig: PlaygroundConfigEntity;

  @inject(HistoryService) private readonly historyService: HistoryService;

  private readonly toDispose = new DisposableCollection();

  public callNodePanel: CallNodePanel = async () => undefined;

  /** 销毁 */
  public dispose(): void {
    this.toDispose.dispose();
  }

  public setCallNodePanel(callNodePanel: CallNodePanel) {
    this.callNodePanel = callNodePanel;
  }

  /** 唤起节点面板 */
  public async call(
    callParams: NodePanelCallParams
  ): Promise<WorkflowNodeEntity | WorkflowNodeEntity[] | undefined> {
    const {
      panelPosition,
      fromPort,
      enableMultiAdd = false,
      panelProps = {},
      containerNode,
      afterAddNode,
    } = callParams;

    if (!panelPosition || this.playgroundConfig.readonly) {
      return;
    }

    const nodes: WorkflowNodeEntity[] = [];

    return new Promise((resolve) => {
      this.callNodePanel({
        position: panelPosition,
        enableMultiAdd,
        panelProps,
        containerNode: WorkflowNodePanelUtils.getContainerNode({
          fromPort,
          containerNode,
        }),
        onSelect: async (panelParams?: NodePanelResult) => {
          const node = await this.addNode(callParams, panelParams);
          afterAddNode?.(node);
          if (!enableMultiAdd) {
            resolve(node);
          } else if (node) {
            nodes.push(node);
          }
        },
        onClose: () => {
          resolve(enableMultiAdd ? nodes : undefined);
        },
      });
    });
  }

  /**
   * 唤起单选面板
   */
  public async singleSelectNodePanel(
    params: Omit<CallNodePanelParams, 'onSelect' | 'onClose' | 'enableMultiAdd'>
  ): Promise<NodePanelResult | undefined> {
    return new Promise((resolve) => {
      this.callNodePanel({
        ...params,
        enableMultiAdd: false,
        onSelect: async (panelParams?: NodePanelResult) => {
          resolve(panelParams);
        },
        onClose: () => {
          resolve(undefined);
        },
      });
    });
  }

  /** 添加节点 */
  private async addNode(
    callParams: NodePanelCallParams,
    panelParams: NodePanelResult
  ): Promise<WorkflowNodeEntity | undefined> {
    const {
      panelPosition,
      fromPort,
      toPort,
      canAddNode,
      autoOffsetPadding = {
        x: 100,
        y: 100,
      },
      enableBuildLine = false,
      enableSelectPosition = false,
      enableAutoOffset = false,
      enableDragNode = false,
    } = callParams;

    if (!panelPosition || !panelParams) {
      return;
    }

    const { nodeType, selectEvent, nodeJSON } = panelParams;

    const containerNode = WorkflowNodePanelUtils.getContainerNode({
      fromPort,
      containerNode: callParams.containerNode,
    });

    // 判断是否可以添加节点
    if (canAddNode) {
      const canAdd = canAddNode({ nodeType, containerNode });
      if (!canAdd) {
        return;
      }
    }

    // 鼠标选择坐标
    const selectPosition = this.playgroundConfig.getPosFromMouseEvent(selectEvent);

    // 自定义坐标
    const nodePosition: PositionSchema = callParams.customPosition
      ? callParams.customPosition({ nodeType, selectPosition })
      : WorkflowNodePanelUtils.adjustNodePosition({
          nodeType,
          position: enableSelectPosition ? selectPosition : panelPosition,
          fromPort,
          toPort,
          containerNode,
          document: this.document,
          dragService: this.dragService,
        });

    // 创建节点
    const node: WorkflowNodeEntity = this.document.createWorkflowNodeByType(
      nodeType,
      nodePosition,
      nodeJSON ?? ({} as WorkflowNodeJSON),
      containerNode?.id
    );

    if (!node) {
      return;
    }

    // 后续节点偏移
    if (enableAutoOffset && fromPort && toPort) {
      WorkflowNodePanelUtils.subNodesAutoOffset({
        node,
        fromPort,
        toPort,
        padding: autoOffsetPadding,
        containerNode,
        historyService: this.historyService,
        dragService: this.dragService,
        linesManager: this.linesManager,
      });
    }

    if (!enableBuildLine && !enableDragNode) {
      return node;
    }

    // 等待节点渲染
    await WorkflowNodePanelUtils.waitNodeRender();

    // 重建连线（需先让端口完成渲染）
    if (enableBuildLine) {
      WorkflowNodePanelUtils.buildLine({
        fromPort,
        node,
        toPort,
        linesManager: this.linesManager,
      });
    }

    // 开始拖拽节点
    if (enableDragNode) {
      this.selectService.selectNode(node);
      this.dragService.startDragSelectedNodes(selectEvent);
    }

    return node;
  }
}
