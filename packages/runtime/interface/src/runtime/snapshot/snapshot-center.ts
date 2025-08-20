/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ISnapshot, Snapshot, SnapshotData } from './snapshot';

export interface ISnapshotCenter {
  id: string;
  create(snapshot: Partial<SnapshotData>): ISnapshot;
  exportAll(): Snapshot[];
  export(): Record<string, Snapshot[]>;
  init(): void;
  dispose(): void;
}
