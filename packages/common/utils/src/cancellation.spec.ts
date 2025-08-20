/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import {
  CancellationToken,
  CancellationTokenSource,
  type MutableToken,
  cancelled,
  checkCancelled,
  isCancelled,
} from './cancellation';

describe('cancellation', () => {
  test('CancellationTokenSource', async () => {
    const tokenSource = new CancellationTokenSource();
    tokenSource.dispose();
    expect(tokenSource.token.isCancellationRequested).toBeTruthy();
  });

  test('CancellationTokenSource', async () => {
    const tokenSource = new CancellationTokenSource();
    expect(tokenSource.token).toBeDefined();
    tokenSource.dispose();
    expect(tokenSource.token.isCancellationRequested).toBeTruthy();
  });

  test('CancellationTokenSource', async () => {
    const tokenSource = new CancellationTokenSource();

    const arr: number[] = [];
    const listener = (): void => {
      arr.push(1);
    };
    tokenSource.token.onCancellationRequested(listener);
    const mutableToken = tokenSource.token as MutableToken;
    expect(mutableToken.isCancellationRequested).toBeFalsy();
    mutableToken.cancel();
    expect(mutableToken.isCancellationRequested).toBeTruthy();

    const shortcutEventDisposable = tokenSource.token.onCancellationRequested(listener);
    shortcutEventDisposable.dispose();
    expect(mutableToken.isCancellationRequested).toBeTruthy();
  });

  test('cancelled()', async () => {
    expect(cancelled().message).toEqual('Cancelled');
  });

  test('isCancelled()', async () => {
    expect(isCancelled(cancelled())).toBeTruthy();
  });

  test('checkCancelled()', async () => {
    expect(checkCancelled(CancellationToken.None)).toBeUndefined();
    expect(() => checkCancelled(CancellationToken.Cancelled)).toThrowError(/Cancelled/);
  });
});
