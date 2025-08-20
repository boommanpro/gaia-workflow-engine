/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IVariableStore } from '@runtime/variable';
import { IStatusCenter } from '@runtime/status';
import { IState } from '@runtime/state';
import { ISnapshotCenter } from '@runtime/snapshot';
import { IReporter } from '@runtime/reporter';
import { IMessageCenter } from '@runtime/message';
import { IIOCenter } from '@runtime/io-center';
import { IDocument } from '@runtime/document';
import { ICache } from '@runtime/cache';
import { InvokeParams } from '@runtime/base';

export interface ContextData {
  cache: ICache;
  variableStore: IVariableStore;
  state: IState;
  document: IDocument;
  ioCenter: IIOCenter;
  snapshotCenter: ISnapshotCenter;
  statusCenter: IStatusCenter;
  messageCenter: IMessageCenter;
  reporter: IReporter;
}

export interface IContext extends ContextData {
  id: string;
  init(params: InvokeParams): void;
  dispose(): void;
  sub(): IContext;
}
