/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject, optional } from 'inversify';
import { PositionSchema } from '@flowgram.ai/utils';
import { HistoryService } from '@flowgram.ai/history';
import { fitView, WorkflowDocument, WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { FreeOperationType } from '@flowgram.ai/free-history-plugin';
import { AutoLayoutService, LayoutOptions } from '@flowgram.ai/free-auto-layout-plugin';
import { Playground, TransformData } from '@flowgram.ai/editor';

export type AutoLayoutResetFn = () => void;

export type AutoLayoutToolOptions = LayoutOptions & {
  disableFitView?: boolean;
};

/**
 * Auto layout tool - 自动布局工具
 */
@injectable()
export class WorkflowAutoLayoutTool {
  @inject(WorkflowDocument) private document: WorkflowDocument;

  @inject(Playground)
  private playground: Playground;

  @inject(AutoLayoutService) private autoLayoutService: AutoLayoutService;

  @inject(HistoryService) @optional() private historyService: HistoryService;

  public async handle(options: AutoLayoutToolOptions = {}): Promise<AutoLayoutResetFn> {
    const { disableFitView = false, ...layoutOptions } = options;
    if (this.playground.config.readonly) {
      return () => {};
    }
    this.fitView(disableFitView);
    const resetFn = await this.autoLayout(layoutOptions);
    this.fitView(disableFitView);
    return resetFn;
  }

  private async autoLayout(options?: LayoutOptions): Promise<AutoLayoutResetFn> {
    const nodes = this.document.getAllNodes();
    const startPositions = nodes.map(this.getNodePosition);
    await this.autoLayoutService.layout(options);
    const endPositions = nodes.map(this.getNodePosition);
    this.updateHistory({
      nodes,
      startPositions,
      endPositions,
    });
    return this.createResetFn({
      nodes,
      startPositions,
    });
  }

  private fitView(disable = false): void {
    if (disable) {
      return;
    }
    fitView(this.document, this.playground.config);
  }

  private getNodePosition(node: WorkflowNodeEntity): PositionSchema {
    const transform = node.getData(TransformData);
    return {
      x: transform.position.x,
      y: transform.position.y,
    };
  }

  private createResetFn(params: {
    nodes: WorkflowNodeEntity[];
    startPositions: PositionSchema[];
  }): AutoLayoutResetFn {
    const { nodes, startPositions } = params;
    return () => {
      nodes.forEach((node, index) => {
        const transform = node.getData(TransformData);
        const position = startPositions[index];
        transform.update({
          position,
        });
      });
    };
  }

  private updateHistory(params: {
    nodes: WorkflowNodeEntity[];
    startPositions: PositionSchema[];
    endPositions: PositionSchema[];
  }): void {
    const { nodes, startPositions: oldValue, endPositions: value } = params;
    const ids = nodes.map((node) => node.id);
    this.historyService?.pushOperation(
      {
        type: FreeOperationType.dragNodes,
        value: {
          ids,
          value,
          oldValue,
        },
      },
      {
        noApply: true,
      }
    );
  }
}
