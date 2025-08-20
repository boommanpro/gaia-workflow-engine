/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';

import { ReactiveBaseState, Tracker } from '../src';

describe('reactive-base-state', () => {
  it('base', () => {
    const state = new ReactiveBaseState(0);
    let autorunTimes = -1;
    const compute = Tracker.autorun<number>(() => {
      autorunTimes++;
      return autorunTimes <= 2 ? state.value : -1;
    });
    expect(state.hasDependents()).toEqual(true);
    expect(autorunTimes).toEqual(0);
    expect(compute.result).toEqual(0);
    state.value = 1;
    expect(compute.result).toEqual(0);
    expect(autorunTimes).toEqual(0);
    Tracker.flush();
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
    Tracker.flush();
    // Still 1!
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
    state.value = 1;
    Tracker.flush();
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
    state.value = 2;
    Tracker.flush();
    expect(compute.result).toEqual(2);
    expect(autorunTimes).toEqual(2);
    state.value = 3;
    Tracker.flush();
    expect(compute.result).toEqual(-1);
    expect(autorunTimes).toEqual(3);
    state.value = 4;
    Tracker.flush();
    // Still 1!
    expect(compute.result).toEqual(-1);
    expect(autorunTimes).toEqual(3);
  });
  it('custom isEqual', () => {
    const state = new ReactiveBaseState(0, {
      isEqual: () => false,
    });
    let autorunTimes = 0;
    Tracker.autorun<number>(() => {
      autorunTimes++;
      return state.value;
    });
    // isEqual 不再判断是否相等, 所以会触发刷新
    state.value = 0;
    Tracker.flush();
    expect(autorunTimes).toEqual(2);
  });
});
