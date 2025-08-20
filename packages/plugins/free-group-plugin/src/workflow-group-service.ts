/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';
import { DisposableCollection, Disposable } from '@flowgram.ai/utils';
import { FreeLayoutPluginContext } from '@flowgram.ai/free-layout-editor';
import {
  WorkflowDocument,
  WorkflowOperationBaseService,
  WorkflowNodeEntity,
  WorkflowNodeJSON,
  WorkflowNodeRegistry,
} from '@flowgram.ai/free-layout-core';
import { HistoryService } from '@flowgram.ai/free-history-plugin';
import {
  NodeIntoContainerService,
  NodeIntoContainerType,
} from '@flowgram.ai/free-container-plugin';
import { FlowGroupService, FlowNodeBaseType } from '@flowgram.ai/document';
import { TransformData } from '@flowgram.ai/core';

import { WorkflowGroupUtils } from './utils';
import { WorkflowGroupPluginOptions } from './type';

@injectable()
/** 分组服务 */
export class WorkflowGroupService extends FlowGroupService {
  @inject(WorkflowDocument) private document: WorkflowDocument;

  @inject(WorkflowOperationBaseService) freeOperationService: WorkflowOperationBaseService;

  @inject(HistoryService) private historyService: HistoryService;

  @inject(NodeIntoContainerService) private nodeIntoContainerService: NodeIntoContainerService;

  @inject(WorkflowGroupPluginOptions) private opts: WorkflowGroupPluginOptions;

  @inject(FreeLayoutPluginContext) private context: FreeLayoutPluginContext;

  private toDispose = new DisposableCollection();

  public ready(): void {
    this.toDispose.push(this.listenContainer());
  }

  public dispose(): void {
    this.toDispose.dispose();
  }

  /** 创建分组节点 */
  public createGroup(nodes: WorkflowNodeEntity[]): WorkflowNodeEntity | undefined {
    if (!WorkflowGroupUtils.validate(nodes)) {
      return;
    }
    const parent = nodes[0].parent ?? this.document.root;
    const nodeRegistry = this.document.getNodeRegistry<WorkflowNodeRegistry>(
      FlowNodeBaseType.GROUP
    );
    let groupJSON: WorkflowNodeJSON = nodeRegistry?.onAdd?.(this.context);
    if (this.opts.initGroupJSON) {
      groupJSON = this.opts.initGroupJSON(groupJSON, nodes);
    }
    this.historyService.startTransaction();
    this.document.createWorkflowNodeByType(
      FlowNodeBaseType.GROUP,
      {
        x: 0,
        y: 0,
      },
      groupJSON,
      parent.id
    );
    nodes.forEach((node) => {
      this.freeOperationService.moveNode(node, {
        parent: groupJSON.id,
      });
    });
    this.historyService.endTransaction();
  }

  /** 取消分组 */
  public ungroup(groupNode: WorkflowNodeEntity): void {
    const groupBlocks = groupNode.blocks.slice();
    if (!groupNode.parent) {
      return;
    }
    const groupPosition = groupNode.transform.position;

    this.historyService.startTransaction();
    groupBlocks.forEach((node) => {
      this.freeOperationService.moveNode(node, {
        parent: groupNode.parent?.id,
      });
    });
    groupNode.dispose();
    groupBlocks.forEach((node) => {
      const transform = node.getData(TransformData);
      const position = {
        x: transform.position.x + groupPosition.x,
        y: transform.position.y + groupPosition.y,
      };
      this.freeOperationService.updateNodePosition(node, position);
    });
    this.historyService.endTransaction();
  }

  private listenContainer(): Disposable {
    return this.nodeIntoContainerService.on((e) => {
      if (
        e.type !== NodeIntoContainerType.Out ||
        e.sourceContainer?.flowNodeType !== FlowNodeBaseType.GROUP
      ) {
        return;
      }
      if (e.sourceContainer?.blocks.length === 0) {
        e.sourceContainer.dispose();
      }
    });
  }
}
