/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum WorkflowStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'canceled',
}

export interface StatusData {
  status: WorkflowStatus;
  terminated: boolean;
  startTime: number;
  endTime?: number;
  timeCost: number;
}

export interface IStatus extends StatusData {
  id: string;
  process(): void;
  success(): void;
  fail(): void;
  cancel(): void;
  export(): StatusData;
}

export interface IStatusCenter {
  workflow: IStatus;
  nodeStatus(nodeID: string): IStatus;
  init(): void;
  dispose(): void;
  getStatusNodeIDs(status: WorkflowStatus): string[];
  exportNodeStatus(): Record<string, StatusData>;
}
