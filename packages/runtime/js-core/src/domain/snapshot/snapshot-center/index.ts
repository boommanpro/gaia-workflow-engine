import { Snapshot, ISnapshotCenter, SnapshotData, ISnapshot } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';
import { WorkflowRuntimeSnapshot } from '../snapshot-entity';

export class WorkflowRuntimeSnapshotCenter implements ISnapshotCenter {
  public readonly id: string;

  private snapshots: ISnapshot[];

  constructor() {
    this.id = uuid();
  }

  public create(snapshotData: Partial<SnapshotData>): ISnapshot {
    const snapshot = WorkflowRuntimeSnapshot.create(snapshotData);
    this.snapshots.push(snapshot);
    return snapshot;
  }

  public init(): void {
    this.snapshots = [];
  }

  public dispose(): void {
    // because the data is not persisted, do not clear the execution result
  }

  public exportAll(): Snapshot[] {
    return this.snapshots.slice().map((snapshot) => snapshot.export());
  }

  public export(): Record<string, Snapshot[]> {
    const result: Record<string, Snapshot[]> = {};
    this.exportAll().forEach((snapshot) => {
      if (result[snapshot.nodeID]) {
        result[snapshot.nodeID].push(snapshot);
      } else {
        result[snapshot.nodeID] = [snapshot];
      }
    });
    return result;
  }
}
