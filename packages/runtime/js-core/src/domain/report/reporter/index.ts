import {
  ISnapshotCenter,
  IReporter,
  IStatusCenter,
  IIOCenter,
  IReport,
  NodeReport,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeReport } from '../report-value-object';

export class WorkflowRuntimeReporter implements IReporter {
  constructor(
    public readonly ioCenter: IIOCenter,
    public readonly snapshotCenter: ISnapshotCenter,
    public readonly statusCenter: IStatusCenter
  ) {}

  public init(): void {}

  public dispose(): void {}

  public export(): IReport {
    const report = WorkflowRuntimeReport.create({
      inputs: this.ioCenter.inputs,
      outputs: this.ioCenter.outputs,
      workflowStatus: this.statusCenter.workflow.export(),
      reports: this.nodeReports(),
    });
    return report;
  }

  private nodeReports(): Record<string, NodeReport> {
    const reports: Record<string, NodeReport> = {};
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
