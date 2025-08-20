/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';

import { OperationRegistry, OperationService } from './operation';
import { HistoryContext } from './history-context';
import {
  HistoryService,
  HistoryStack,
  HistoryManager,
  UndoRedoService,
  HistoryConfig,
} from './history';

export const HistoryContainerModule = new ContainerModule(
  (bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation, _onDeactivation) => {
    bind(OperationRegistry).toSelf().inSingletonScope();
    bind(OperationService).toSelf().inSingletonScope();
    bind(UndoRedoService).toSelf().inSingletonScope();
    bind(HistoryService).toSelf().inSingletonScope();
    bind(HistoryContext).toSelf().inSingletonScope();
    bind(HistoryManager).toSelf().inSingletonScope();
    bind(HistoryStack).toSelf().inSingletonScope();
    bind(HistoryConfig).toSelf().inSingletonScope();

    onActivation(HistoryService, (ctx, historyService) => {
      let historyManager;

      if (ctx.container?.parent?.isBound(HistoryManager)) {
        historyManager = ctx.container?.parent?.get(HistoryManager);
      } else {
        historyManager = ctx.container.get(HistoryManager);
      }

      if (!historyManager) {
        return historyService;
      }

      historyService.historyManager = historyManager;
      historyManager.registerHistoryService(historyService);
      return historyService;
    });
  }
);
