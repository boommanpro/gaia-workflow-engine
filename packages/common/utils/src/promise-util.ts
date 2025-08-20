/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { CancellationToken, cancelled } from './cancellation';

/**
 * Simple implementation of the deferred pattern.
 * An object that exposes a promise and functions to resolve and reject it.
 */
export class PromiseDeferred<T> {
  resolve: (value?: T | PromiseLike<T>) => void;

  reject: (err?: any) => void;

  promise = new Promise<T>((resolve, reject) => {
    // @ts-ignore
    this.resolve = resolve;
    this.reject = reject;
  });
}

export const Deferred = PromiseDeferred;
/**
 * @returns resolves after a specified number of milliseconds
 * @throws cancelled if a given token is cancelled before a specified number of milliseconds
 */
export function delay(ms: number, token = CancellationToken.None): Promise<void> {
  const deferred = new PromiseDeferred<void>();
  const handle = setTimeout(() => deferred.resolve(), ms);
  token.onCancellationRequested(() => {
    clearTimeout(handle);
    deferred.reject(cancelled());
  });
  return deferred.promise;
}

export async function retry<T>(
  task: () => Promise<T>,
  delayTime: number,
  retries: number,
  shouldRetry?: (res: T) => boolean,
): Promise<T> {
  let lastError: Error | undefined;
  let result: T;

  for (let i = 0; i < retries; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await task();
      if (shouldRetry && shouldRetry(result)) {
        // eslint-disable-next-line no-await-in-loop
        await delay(delayTime);
        // eslint-disable-next-line no-continue
        continue;
      }
      return result;
    } catch (error: any) {
      lastError = error;

      // eslint-disable-next-line no-await-in-loop
      await delay(delayTime);
    }
  }

  if (lastError) {
    throw lastError;
  }
  return result!;
}

export interface PromiseTask<T> {
  (): Promise<T>;
}

export interface PromisePoolOpts {
  intervalCount?: number; // 每批数目
  intervalTime?: number; // 执行一批后的间隔时间, 默认没有间隔
  retries?: number; // 如果某个执行失败, 尝试的次数，默认不尝试
  retryDelay?: number;
}

const PromisePoolOptsDefault: Required<PromisePoolOpts> = {
  intervalCount: 10, // 每批数目
  intervalTime: 0,
  retries: 0,
  retryDelay: 10,
};

export class PromisePool {
  protected opts: Required<PromisePoolOpts>;

  constructor(opts: PromisePoolOpts = PromisePoolOptsDefault) {
    this.opts = { ...PromisePoolOptsDefault, ...opts };
  }

  protected async tryToExec<T>(
    task: PromiseTask<T>,
    checkIfRetry?: (res: T) => boolean,
  ): Promise<T> {
    if (this.opts.retries === 0) return task();
    return retry<T>(task, this.opts.retryDelay, this.opts.retries, checkIfRetry);
  }

  /**
   * @param tasks 执行任务
   * @param checkIfRetry 判断结果是否需要重试
   */
  async run<T>(tasks: PromiseTask<T>[], checkIfRetry?: (res: T) => boolean): Promise<T[]> {
    if (tasks.length === 0) return [];
    const curTasks = tasks.slice(0, this.opts.intervalCount);
    const promises = curTasks.map(task => this.tryToExec<T>(task, checkIfRetry));
    const result: T[] = await Promise.all(promises);
    const nextTasks = tasks.slice(this.opts.intervalCount);
    if (nextTasks.length === 0) return result;
    if (this.opts.intervalTime !== 0) await delay(this.opts.intervalTime);
    return result.concat(await this.run(nextTasks, checkIfRetry));
  }
}
