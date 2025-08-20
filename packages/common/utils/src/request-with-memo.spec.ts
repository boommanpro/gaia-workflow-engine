/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, test, expect } from 'vitest';

import { clearRequestCache, requestWithMemo } from './request-with-memo';

function delay(time: number): Promise<void> {
  return new Promise(res => {
    setTimeout(res, time);
  });
}
describe('request with memo', () => {
  test('base', async () => {
    const cb = vi.fn();
    const requestMock = async () => cb();
    const newRequest = requestWithMemo(requestMock);
    await newRequest();
    await newRequest();
    expect(cb.mock.calls.length).toEqual(1);
    clearRequestCache();
    await newRequest();
    expect(cb.mock.calls.length).toEqual(2);
  });
  test('timeout clear', async () => {
    const cb = vi.fn();
    const requestMock = async () => cb();
    const newRequest = requestWithMemo(requestMock, 0);
    await newRequest();
    await delay(10);
    await newRequest();
    expect(cb.mock.calls.length).toEqual(2);
  });
  test('request with error', async () => {
    const cb = vi.fn();
    const requestMock = async () => {
      cb();
      throw new Error('requestError');
    };
    const newRequest = requestWithMemo(requestMock, 0);
    let errorTimes = 0;
    try {
      await newRequest();
    } catch (e) {
      errorTimes += 1;
    }
    try {
      await newRequest();
    } catch (e) {
      errorTimes += 1;
    }
    expect(errorTimes).toEqual(2);
    // 错误发生不会被缓存
    expect(cb.mock.calls.length).toEqual(2);
  });
});
