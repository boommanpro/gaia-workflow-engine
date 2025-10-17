/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';

import { ReactiveState, Tracker } from '../src';

describe('reactive-state', () => {
  it('base', () => {
    const state = new ReactiveState({ a: 0, b: 0 });
    const { value } = state;
    let autorunTimes = -1;
    const compute = Tracker.autorun<number>(() => {
      autorunTimes++;
      return value.a;
    });
    expect(state.hasDependents()).toEqual(true);
    expect(autorunTimes).toEqual(0);
    expect(compute.result).toEqual(0);
    state.value.a = 1;
    expect(compute.result).toEqual(0);
    expect(autorunTimes).toEqual(0);
    Tracker.flush();
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
    Tracker.flush();
    // Still 1!
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
    state.value.a = 1;
    Tracker.flush();
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
    state.value.b = 1;
    Tracker.flush();
    expect(compute.result).toEqual(1);
    expect(autorunTimes).toEqual(1);
  });
  it('keys', () => {
    const state = new ReactiveState<{ a: number; b: number }>({ a: 0, b: 0 });
    expect(state.keys()).toEqual(['a', 'b']);
    expect(Object.keys(state.value)).toEqual(['a', 'b']);
    expect(Object.keys(state.readonlyValue)).toEqual(['a', 'b']);
  });
  it('hasDependents', () => {
    const state = new ReactiveState<{ a: number; b: number }>({ a: 0, b: 0 });
    expect(state.hasDependents()).toEqual(false);
    const compute = Tracker.autorun<number>(() => state.value.a);
    expect(state.hasDependents()).toEqual(true);
    compute.stop();
    expect(state.hasDependents()).toEqual(false);
  });
  it('set all value', () => {
    const state = new ReactiveState<{ a: number; b: number }>({ a: 0, b: 0 });
    const compute = Tracker.autorun<number>(() => state.value.a);
    state.value = { a: 1, b: 1 };
    Tracker.flush();
    expect(compute.result).toEqual(1);
  });
  it('dict state iterator (use Proxy)', () => {
    const { value } = new ReactiveState<{ a: number; b: number }>({ a: 0, b: 0 });
    let autorunTimes = -1;
    const compute = Tracker.autorun<{ a: number; b: number }>(() => {
      autorunTimes++;
      const result = {};
      for (let key in value) {
        result[key] = value[key];
      }
      return result as any;
    });
    expect(autorunTimes).toEqual(0);
    expect(compute.result).toEqual({ a: 0, b: 0 });
    value.a = 1;
    value.b = 1;
    Tracker.flush();
    expect(autorunTimes).toEqual(1);
    expect(compute.result).toEqual({ a: 1, b: 1 });
  });
  it('dict state iterator (use defineProperty)', () => {
    global.__ignoreProxy = true;
    const { value } = new ReactiveState<{ a: number; b: number }>({ a: 0, b: 0 });
    let autorunTimes = -1;
    const compute = Tracker.autorun<{ a: number; b: number }>(() => {
      autorunTimes++;
      const result = {};
      for (let key in value) {
        result[key] = value[key];
      }
      return result as any;
    });
    expect(Object.keys(value)).toEqual(['a', 'b']);
    expect(autorunTimes).toEqual(0);
    expect(compute.result).toEqual({ a: 0, b: 0 });
    value.a = 1;
    value.b = 1;
    Tracker.flush();
    expect(autorunTimes).toEqual(1);
    expect(compute.result).toEqual({ a: 1, b: 1 });
    global.__ignoreProxy = false;
  });
  it('set unknown field', () => {
    const { value } = new ReactiveState<Record<string, any>>({});
    let runTimes = 0;
    const compute = Tracker.autorun(() => {
      runTimes++;
      return value.a;
    });
    value.a = 'new field';
    Tracker.flush();
    expect(runTimes).toEqual(2);
    expect(compute.result).toEqual('new field');
    expect(Object.keys(value)).toEqual(['a']);
    delete value.a;
    expect(Object.keys(value)).toEqual([]);
  });
  it('readonly value (use Proxy)', () => {
    const originState = new ReactiveState({ a: 0, b: 0 });
    const readonlyValue = originState.readonlyValue;
    expect(() => {
      (readonlyValue as any).a = 1;
    }).toThrow(/readonly field/);
  });
  it('readonly value (use define property)', () => {
    global.__ignoreProxy = true;
    const originState = new ReactiveState({ a: 0, b: 0 });
    const readonlyValue = originState.readonlyValue;
    expect(() => {
      (readonlyValue as any).a = 1;
    }).toThrow(/readonly field/);
    global.__ignoreProxy = false;
  });
});
