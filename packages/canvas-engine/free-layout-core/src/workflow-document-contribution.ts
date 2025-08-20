/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';
import {
  type FlowDocumentContribution,
  FlowNodeRenderData,
  FlowNodeTransformData,
} from '@flowgram.ai/document';

import { WorkflowDocument } from './workflow-document';
import { FreeLayout } from './layout';
import { WorkflowNodeLinesData, WorkflowNodePortsData } from './entity-datas';

@injectable()
export class WorkflowDocumentContribution implements FlowDocumentContribution<WorkflowDocument> {
  @inject(FreeLayout) freeLayout: FreeLayout;

  registerDocument(document: WorkflowDocument): void {
    // 注册节点数据
    document.registerNodeDatas(
      FlowNodeTransformData,
      FlowNodeRenderData,
      WorkflowNodePortsData,
      WorkflowNodeLinesData,
    );
    document.registerLayout(this.freeLayout);
  }
}
