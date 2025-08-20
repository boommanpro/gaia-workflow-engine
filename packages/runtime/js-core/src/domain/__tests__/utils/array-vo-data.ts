/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { VOData } from '@flowgram.ai/runtime-interface';

export const arrayVOData = <T>(arr: T[]): Array<VOData<T>> =>
  arr.map((item: any) => {
    const { id, ...data } = item;
    return data;
  });
