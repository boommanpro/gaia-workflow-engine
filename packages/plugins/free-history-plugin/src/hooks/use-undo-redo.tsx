/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { useService } from '@flowgram.ai/core';
import { HistoryService } from '@flowgram.ai/history';

interface UndoRedo {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export function useUndoRedo(): UndoRedo {
  const historyService = useService<HistoryService>(HistoryService);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const toDispose = historyService.undoRedoService.onChange(() => {
      setCanUndo(historyService.canUndo());
      setCanRedo(historyService.canRedo());
    });
    return () => {
      toDispose.dispose();
    };
  }, []);

  return {
    canUndo,
    canRedo,
    undo: () => historyService.undo(),
    redo: () => historyService.redo(),
  };
}
