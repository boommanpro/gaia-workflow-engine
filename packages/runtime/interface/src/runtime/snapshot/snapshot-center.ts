import { ISnapshot, Snapshot, SnapshotData } from './snapshot';

export interface ISnapshotCenter {
  id: string;
  create(snapshot: Partial<SnapshotData>): ISnapshot;
  exportAll(): Snapshot[];
  export(): Record<string, Snapshot[]>;
  init(): void;
  dispose(): void;
}
