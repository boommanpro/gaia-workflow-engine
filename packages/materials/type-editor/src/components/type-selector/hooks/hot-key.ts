/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { TypeSelectorRef } from '../type';

interface HotKeyConfig {
  matcher: (event: React.KeyboardEvent) => boolean;
  callback: () => void;
  preventDefault?: boolean;
}

export const useTypeSelectorHotKey = (selector: React.MutableRefObject<TypeSelectorRef | null>) => {
  const hotKeyConfig: HotKeyConfig[] = useMemo(() => {
    const res: HotKeyConfig[] = [
      {
        matcher: (e) => e.key === 'Enter',
        callback: () => {
          selector.current?.selectFocusItem();
        },
      },
      {
        matcher: (e) => e.key === 'ArrowUp',
        callback: () => {
          selector.current?.moveFocusItemUp();
        },
        preventDefault: true,
      },

      {
        matcher: (e) => e.key === 'ArrowLeft',
        callback: () => {
          selector.current?.moveFocusItemLeft();
        },
        preventDefault: true,
      },
      {
        matcher: (e) => e.key === 'ArrowRight',
        callback: () => {
          selector.current?.moveFocusItemRight();
        },
        preventDefault: true,
      },
      {
        matcher: (e) => e.key === 'ArrowDown',
        callback: () => {
          selector.current?.moveFocusItemDown();
        },
        preventDefault: true,
      },
    ];

    return res;
  }, []);

  return hotKeyConfig;
};
