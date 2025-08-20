/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect } from 'vitest';

import { Emitter, Event } from './event';

describe('event', () => {
  test('emitter base', () => {
    const emitter = new Emitter<number>();
    expect(emitter.disposed).toBe(false);
    const doResult: number[] = [];
    const doResult2: number[] = [];
    const doContext = {};
    function listener1(num: number) {
      doResult.push(num);
    }
    function listener2(num: number) {
      // @ts-ignore
      expect(this).toEqual(doContext);
      doResult2.push(num);
    }
    const dispose1 = emitter.event(listener1);
    emitter.event(listener2, doContext);
    emitter.fire(1);
    expect(doResult).toEqual([1]);
    expect(doResult2).toEqual([1]);
    emitter.fire(2);
    expect(doResult).toEqual([1, 2]);
    expect(doResult2).toEqual([1, 2]);
    dispose1.dispose();
    emitter.fire(3);
    expect(doResult).toEqual([1, 2]);
    expect(doResult2).toEqual([1, 2, 3]);
    emitter.dispose(); // dispose the event;
    expect(emitter.disposed).toBe(true);
    emitter.fire(4);
    expect(doResult).toEqual([1, 2]);
    expect(doResult2).toEqual([1, 2, 3]);
  });
  test('emitter with dispose', () => {
    const emitter = new Emitter<number>();
    emitter.dispose(); // dispose the event;
    const doResult: number[] = [];
    function listener1(num: number) {
      doResult.push(num);
    }
    const dispose1 = emitter.event(listener1);
    expect(Event.None(() => {}) === dispose1).toBeTruthy();
    emitter.fire(1); // do nothing
    expect(doResult).toEqual([]);
  });
});
