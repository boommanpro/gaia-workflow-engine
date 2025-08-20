/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { FlowOperation, FlowOperationBaseServiceImpl } from '@flowgram.ai/document';
import { HistoryService } from '@flowgram.ai/history';

@injectable()
export class FixedHistoryOperationService extends FlowOperationBaseServiceImpl {
  @inject(HistoryService) historyService: HistoryService;

  apply(operation: FlowOperation): any {
    return this.historyService.pushOperation(operation);
  }

  originApply(operation: FlowOperation): any {
    return super.apply(operation);
  }

  transact(transaction: () => void): void {
    this.historyService.transact(transaction);
  }
}
