/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorOperationService, TypeEditorService } from '../../../services';
import { useService } from '../../../contexts';

interface HotKeyConfig {
  matcher: (event: React.KeyboardEvent) => boolean;
  callback: () => void;
  preventDefault?: boolean;
}

export const useTypeEditorHotKey = () => {
  const typeEditor = useService<TypeEditorService<IJsonSchema>>(TypeEditorService);
  const operator = useService<TypeEditorOperationService<IJsonSchema>>(TypeEditorOperationService);

  const hotKeyConfig: HotKeyConfig[] = useMemo(() => {
    const res: HotKeyConfig[] = [
      {
        matcher: (e) => e.key === 'Enter',
        callback: () => {
          typeEditor.triggerShortcutEvent('enter');
        },
        preventDefault: true,
      },
      {
        matcher: (e) => e.key === 'ArrowUp',
        callback: () => {
          typeEditor.triggerShortcutEvent('up');
        },
        preventDefault: true,
      },
      {
        matcher: (e) => e.key === 'Tab',
        callback: () => {
          typeEditor.triggerShortcutEvent('tab');
        },
        preventDefault: true,
      },
      {
        matcher: (e) => e.key === 'ArrowLeft',
        callback: () => {
          typeEditor.triggerShortcutEvent('left');
        },
      },
      {
        matcher: (e) => e.key === 'ArrowRight',
        callback: () => {
          typeEditor.triggerShortcutEvent('right');
        },
      },
      {
        matcher: (e) => e.key === 'ArrowDown',
        callback: () => {
          typeEditor.triggerShortcutEvent('down');
        },
        preventDefault: true,
      },
      {
        matcher: (e) => (e.metaKey || e.ctrlKey) && e.key === 'c',
        callback: () => {
          typeEditor.triggerShortcutEvent('copy');
        },
      },
      {
        matcher: (e) => (e.metaKey || e.ctrlKey) && e.key === 'v',
        callback: () => {
          typeEditor.triggerShortcutEvent('paste');
        },
      },
      {
        matcher: (e) => (e.metaKey || e.ctrlKey) && e.key === 'z',
        callback: () => {
          operator.undo();
        },
      },
      {
        matcher: (e) => (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z',
        callback: () => {
          operator.redo();
        },
      },
    ];

    return res;
  }, [typeEditor]);

  return hotKeyConfig;
};
