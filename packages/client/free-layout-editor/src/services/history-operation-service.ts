/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { HistoryService } from '@flowgram.ai/history';
import { WorkflowJSON } from '@flowgram.ai/free-layout-core';

import { WorkflowOperationServiceImpl } from './flow-operation-service';
import { WorkflowOperationService } from '../types';

@injectable()
export class HistoryOperationServiceImpl
  extends WorkflowOperationServiceImpl
  implements WorkflowOperationService
{
  @inject(HistoryService)
  protected historyService: HistoryService;

  startTransaction(): void {
    this.historyService.startTransaction();
  }

  endTransaction(): void {
    this.historyService.endTransaction();
  }

  fromJSON(json: WorkflowJSON): void {
    this.startTransaction();
    try {
      super.fromJSON(json);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('fromJSON error', e);
    }
    this.endTransaction();
  }
}
