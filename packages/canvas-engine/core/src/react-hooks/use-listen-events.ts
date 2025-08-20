/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useLayoutEffect } from 'react';

import { DisposableCollection, type Event } from '@flowgram.ai/utils';

import { useRefresh } from './use-refresh';

/**
 * 监听 event 事件变化
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useListenEvents(...events: Event<any>[]): void {
  const refresh = useRefresh();
  useLayoutEffect(() => {
    const collection = new DisposableCollection();
    collection.pushAll(events.map(e => e(() => refresh())));
    return () => collection.dispose();
  }, [events, refresh]);
}
