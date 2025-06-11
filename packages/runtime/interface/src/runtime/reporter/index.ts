import { StatusData, IStatusCenter } from '../status';
import { Snapshot, ISnapshotCenter } from '../snapshot';
import { WorkflowInputs, WorkflowOutputs } from '../base';
export interface NodeReport extends StatusData {
  id: string;
  snapshots: Snapshot[];
}

export interface IReport {
  id: string;
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
  workflowStatus: StatusData;
  reports: Record<string, NodeReport>;
}

export interface IReporter {
  snapshotCenter: ISnapshotCenter;
  statusCenter: IStatusCenter;
  init(): void;
  dispose(): void;
  export(): IReport;
}
