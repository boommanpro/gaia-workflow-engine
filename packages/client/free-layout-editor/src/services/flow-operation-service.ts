/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { WorkflowOperationBaseServiceImpl } from '@flowgram.ai/free-layout-core';

import { WorkflowOperationService } from '../types';

@injectable()
export class WorkflowOperationServiceImpl
  extends WorkflowOperationBaseServiceImpl
  implements WorkflowOperationService
{
  startTransaction(): void {}

  endTransaction(): void {}
}
