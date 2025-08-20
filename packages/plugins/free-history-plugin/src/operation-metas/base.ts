/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type OperationMeta } from '@flowgram.ai/history';

export const baseOperationMeta: Partial<OperationMeta> = {
  shouldMerge: (_op, prev, element) => {
    if (!prev) {
      return false;
    }

    if (
      // 合并500ms内的操作, 如删除节点会联动删除线条
      Date.now() - element.getTimestamp() <
      500
    ) {
      return true;
    }
    return false;
  },
};
