/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject, optional } from 'inversify';
import { PositionSchema } from '@flowgram.ai/utils';
import { HistoryService } from '@flowgram.ai/history';
import { WorkflowDocument, WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { FreeOperationType } from '@flowgram.ai/free-history-plugin';
import { AutoLayoutService, LayoutOptions } from '@flowgram.ai/free-auto-layout-plugin';
import { Playground, TransformData } from '@flowgram.ai/editor';

export type AutoLayoutResetFn = () => void;

export type AutoLayoutToolOptions = LayoutOptions;

/**
 * Auto layout tool - 自动布局工具
 * https://flowgram.ai/guide/plugin/free-auto-layout-plugin.html
 */
@injectable()
export class WorkflowAutoLayoutTool {
  @inject(WorkflowDocument) private document: WorkflowDocument;

  @inject(Playground)
  private playground: Playground;

  @inject(AutoLayoutService) private autoLayoutService: AutoLayoutService;

  @inject(HistoryService) @optional() private historyService: HistoryService;

  public async handle(options: AutoLayoutToolOptions = {}): Promise<AutoLayoutResetFn> {
    if (this.playground.config.readonly) {
      return () => {};
    }
    const resetFn = await this.autoLayout(options);
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
