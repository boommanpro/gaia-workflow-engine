/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeEntity } from '@flowgram.ai/editor';

export type ComposeListItem<T> = (node: FlowNodeEntity, data: T[]) => T[];

export const compose =
  <T>(fnList: (ComposeListItem<T> | undefined)[]) =>
  (node: FlowNodeEntity, data: T[]): T[] => {
    const list = fnList.filter(Boolean) as ComposeListItem<T>[];
    if (!list.length) {
      return data;
    }
    return list.reduce((acc: T[], fn) => fn(node, acc), data);
  };
