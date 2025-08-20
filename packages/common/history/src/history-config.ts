/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { injectable } from 'inversify';

@injectable()
export class HistoryConfig {
  generateId: () => string = () => nanoid();

  getSnapshot: () => unknown = () => '';
}
