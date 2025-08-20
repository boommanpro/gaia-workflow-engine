/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IMessageCenter, WorkflowMessages } from '@runtime/message';
import { StatusData, IStatusCenter } from '../status';
import { Snapshot, ISnapshotCenter } from '../snapshot';
import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface NodeReport extends StatusData {
  id: string;
  snapshots: Snapshot[];
}

export type WorkflowReports = Record<string, NodeReport>;

export interface IReport {
  id: string;
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
  workflowStatus: StatusData;
  reports: WorkflowReports;
  messages: WorkflowMessages;
}

export interface IReporter {
  snapshotCenter: ISnapshotCenter;
  statusCenter: IStatusCenter;
  messageCenter: IMessageCenter;
  init(): void;
  dispose(): void;
  export(): IReport;
}
