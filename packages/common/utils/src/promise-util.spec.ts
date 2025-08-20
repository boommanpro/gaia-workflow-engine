/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { PromisePool, type PromiseTask, retry, delay } from './promise-util';
import { Emitter } from './event';

describe('promise utils', () => {
  test('timeout', async () => {
    const cancelEmitter = new Emitter();
    cancelEmitter.event(() => {});
    await delay(1, {
      isCancellationRequested: false,
      onCancellationRequested: cancelEmitter.event,
    });
    cancelEmitter.fire(cancelEmitter.event);
  });

  test('retry', async () => {
    const K = 'retry-task';
    const task = () => {
      throw new Error(K);
    };
    expect(() => retry(task, 1, 2)).rejects.toThrow(K);

    const task1 = () =>
      new Promise((resolve, reject) => {
        reject(new Error(K));
      });
    expect(() => retry(task1, 1, 2)).rejects.toThrow(K);
  });

  test('PromisePool/basic', async () => {
    const pool = new PromisePool();
    expect(await pool.run<number>([])).toEqual([]);
    expect(
      await pool.run<number>([
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve(1);
            }, 1);
          }),
      ]),
    ).toEqual([1]);
  });

  test('PromisePool/retry', async () => {
    let execTimes = 0;
    const tasks: PromiseTask<number>[] = Array(10)
      .fill(0)
      .map(
        (t, i) => () =>
          new Promise(resolve => {
            setTimeout(() => {
              execTimes += 1;
              resolve(i);
            }, 10);
          }),
      );
    const pool = new PromisePool({
      intervalCount: 3,
      intervalTime: 100,
      retries: 3,
    });
    const checkIfRetry = (res: number) => {
      if (res === 8) return true;
      return false;
    };
    const result = await pool.run<number>(tasks, checkIfRetry);

    expect(execTimes).toEqual(12);
    expect(result).toEqual(
      Array(10)
        .fill(0)
        .map((t, i) => i),
    );
  });
});
