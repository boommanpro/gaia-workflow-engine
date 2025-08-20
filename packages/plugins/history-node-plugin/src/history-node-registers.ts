/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { type OperationContribution, type OperationRegistry } from '@flowgram.ai/history';

import { operationMetas } from './operation-metas';

/**
 * 表单历史操作
 */
@injectable()
export class HistoryNodeRegisters implements OperationContribution {
  registerOperationMeta(operationRegistry: OperationRegistry): void {
    operationMetas.forEach(operationMeta => {
      operationRegistry.registerOperationMeta(operationMeta);
    });
  }
}
