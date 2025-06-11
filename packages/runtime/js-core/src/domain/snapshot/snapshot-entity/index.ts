import { ISnapshot, Snapshot, SnapshotData } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export class WorkflowRuntimeSnapshot implements ISnapshot {
  public readonly id: string;

  public readonly data: Partial<SnapshotData>;

  public constructor(data: Partial<SnapshotData>) {
    this.id = uuid();
    this.data = data;
  }

  public addData(data: Partial<SnapshotData>): void {
    Object.assign(this.data, data);
  }

  public validate(): boolean {
    const required = ['nodeID', 'inputs', 'outputs', 'data'] as (keyof SnapshotData)[];
    return required.every((key) => this.data[key] !== undefined);
  }

  public export(): Snapshot {
    const snapshot: Snapshot = {
      id: this.id,
      ...this.data,
    } as Snapshot;
    return snapshot;
  }

  public static create(params: Partial<SnapshotData>): ISnapshot {
    return new WorkflowRuntimeSnapshot(params);
  }
}
