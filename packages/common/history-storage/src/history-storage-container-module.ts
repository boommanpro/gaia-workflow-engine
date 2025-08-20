/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';

import { HistoryStorageManager } from './history-storage-manager';

export const HistoryStorageContainerModule = new ContainerModule(bind => {
  bind(HistoryStorageManager).toSelf().inSingletonScope();
});
