import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface SnapshotData {
  nodeID: string;
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
  data: any;
  branch?: string;
}

export interface Snapshot extends SnapshotData {
  id: string;
}

export interface ISnapshot {
  id: string;
  data: Partial<SnapshotData>;
  addData(data: Partial<SnapshotData>): void;
  validate(): boolean;
  export(): Snapshot;
}
