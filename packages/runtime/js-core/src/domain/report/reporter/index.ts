/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  ISnapshotCenter,
  IReporter,
  IStatusCenter,
  IIOCenter,
  IReport,
  NodeReport,
  WorkflowReports,
  IMessageCenter,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeReport } from '../report-value-object';

export class WorkflowRuntimeReporter implements IReporter {
  constructor(
    public readonly ioCenter: IIOCenter,
    public readonly snapshotCenter: ISnapshotCenter,
    public readonly statusCenter: IStatusCenter,
    public readonly messageCenter: IMessageCenter
  ) {}

  public init(): void {}

  public dispose(): void {}

  public export(): IReport {
    const report = WorkflowRuntimeReport.create({
      inputs: this.ioCenter.inputs,
      outputs: this.ioCenter.outputs,
      workflowStatus: this.statusCenter.workflow.export(),
      reports: this.nodeReports(),
      messages: this.messageCenter.export(),
    });
    return report;
  }

  private nodeReports(): WorkflowReports {
    const reports: WorkflowReports = {};
    const statuses = this.statusCenter.exportNodeStatus();
    const snapshots = this.snapshotCenter.export();
    Object.keys(statuses).forEach((nodeID) => {
      const status = statuses[nodeID];
      const nodeSnapshots = snapshots[nodeID] || [];
      const nodeReport: NodeReport = {
        id: nodeID,
        ...status,
        snapshots: nodeSnapshots,
      };
      reports[nodeID] = nodeReport;
    });
    return reports;
  }
}
