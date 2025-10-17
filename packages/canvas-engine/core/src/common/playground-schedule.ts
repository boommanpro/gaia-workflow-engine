/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { throttle } from 'lodash-es';
import { type Disposable } from '@flowgram.ai/utils';

// TODO 先用 throttle 替代
export class PlaygroundSchedule implements Disposable {
  protected execMap: Map<any, () => void> = new Map();

  push(key: any, fn: () => void): void {
    const { execMap } = this;
    if (process.env.NODE_ENV === 'test') {
      fn();
      return;
    }
    let schedule = execMap.get(key);
    if (!schedule) {
      schedule = throttle(fn, 0) as () => void;
      execMap.set(key, schedule);
    }
    schedule();
  }

  dispose(): void {
    this.execMap.clear();
  }
}
