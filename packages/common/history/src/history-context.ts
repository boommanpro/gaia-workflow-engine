/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';

@injectable()
export class HistoryContext {
  /**
   * 所属uri
   */
  uri?: string;

  /**
   * 操作触发的源对象，如编辑器对象
   */
  source?: unknown;
}
