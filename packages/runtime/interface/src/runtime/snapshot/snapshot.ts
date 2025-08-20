/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface SnapshotData {
  nodeID: string;
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
  data: any;
  branch?: string;
  error?: string;
}

export interface Snapshot extends SnapshotData {
  id: string;
}

export interface ISnapshot {
  id: string;
  data: Partial<SnapshotData>;
  update(data: Partial<SnapshotData>): void;
  validate(): boolean;
  export(): Snapshot;
}
